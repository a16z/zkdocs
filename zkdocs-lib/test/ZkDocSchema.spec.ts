import { expect } from "chai";
import { ZkDocJson, ZkDocSchema } from "../src/ZkDocSchema";

describe("ZkDocSchema", async () => {
    it("detects malformed institutions", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                }
            ],
            constraints: [],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                },
                {
                    address: "0xab"
                }]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("detects constraints pointing to non-existent fields", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "jimmy",
                    fieldB: "johns",
                    op: "ADD",
                    constraint: "LT",
                    constant: 20000
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("detects invalid ops", () => {
        let schemaStr = JSON.stringify({
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "jimmy",
                    fieldB: "johns",
                    op: "FAKE",
                    constraint: "LT",
                    constant: 20000
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        })
        let parsedSchema = ZkDocSchema.parseFromString(schemaStr)
        expect(parsedSchema).to.be.undefined
    })
    it("detects invalid constraint types", () => {
        let schemaStr = JSON.stringify({
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_1",
                    fieldB: "field_2",
                    op: "ADD",
                    constraint: "FAKE",
                    constant: 20000
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        })
        let parsedSchema = ZkDocSchema.parseFromString(schemaStr)
        expect(parsedSchema).to.be.undefined
    })
    it("fails with no trusted institutions", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                    constant: 20000
                }
            ],
            trusted_institutions: []
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("fails with invalid institutions", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                    constant: 20000
                }
            ],
            trusted_institutions: [
                {
                    address: "0xab"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("validates string and non string fields", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                    string: true
                }
            ],
            constraints: [],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.not.be.undefined
        expect(parsedSchema!.validateValuesList(["12", "text"])).to.be.true
        expect(parsedSchema!.validateValuesList(["text1", "text2"])).to.be.false
    })
    it("validates numeric fields are positive whole numbers", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                    string: true
                }
            ],
            constraints: [],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.not.be.undefined
        expect(parsedSchema!.validateValuesList(["12", "text"])).to.be.true
        expect(parsedSchema!.validateValuesList(["12.5", "text2"])).to.be.false
        expect(parsedSchema!.validateValuesList(["-12.5", "text2"])).to.be.false
        expect(parsedSchema!.validateValuesList(["0xabc", "text2"])).to.be.false
    })
    it("validates string fields are ascii", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                    string: true
                }
            ],
            constraints: [],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.not.be.undefined
        expect(parsedSchema!.validateValuesList(["12", "text"])).to.be.true
        expect(parsedSchema!.validateValuesList(["12", "TEXT2TEXT"])).to.be.true
        expect(parsedSchema!.validateValuesList(["12", "22TEXt22"])).to.be.true
        expect(parsedSchema!.validateValuesList(["12", "text2✤"])).to.be.false
    })
    it("rejects constraints including string fields", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                    string: true
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                    constant: 20000
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("rejects 2 different RHS types", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                    constant: 20000,
                    fieldCompare: "field_2"
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("rejects no RHS types", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("rejects float constant", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                    constant: 12.1
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("rejects misnamed constraint RHS field", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                }
            ],
            constraints: [
                {
                    fieldA: "field_2",
                    fieldB: "field_1",
                    op: "ADD",
                    constraint: "LT",
                    fieldCompare: "field_3"
                }
            ],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.be.undefined
    })
    it("able to convert ascii strings to big ints", () => {
        expect(ZkDocSchema.encodeStringToBigInt("12").toString(16)).to.be.eq("3132")
        expect(ZkDocSchema.encodeStringToBigInt("the").toString(16)).to.be.eq("746865")
        expect(ZkDocSchema.encodeStringToBigInt("the small dog ran across the road").toString(16)).to.be.eq("74686520736d616c6c20646f672072616e206163726f73732074686520726f")
        expect(ZkDocSchema.encodeStringToBigInt("the small dog ran across the road. the small dog ran across the road").toString(16)).to.be.eq("74686520736d616c6c20646f672072616e206163726f73732074686520726f")
        expect(ZkDocSchema.encodeStringToBigInt("★").toString(16)).to.be.eq("0")
    })
    it("field strings convert to big ints", () => {
        let schema: ZkDocJson = {
            fields: [
                {
                    field_name: "field_1",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                    string: true
                },
                {
                    field_name: "field_2",
                    human_name: "",
                },
                {
                    field_name: "field_2",
                    human_name: "",
                    string: true
                }
            ],
            constraints: [],
            trusted_institutions: [
                {
                    address: "0x1ad91ee08f21be3de0ba2ba6918e714da6b45836"
                }
            ]
        }
        let parsedSchema = ZkDocSchema.parseFromString(JSON.stringify(schema))
        expect(parsedSchema).to.not.be.undefined
        let first = parsedSchema!.convertValueList(["12", "12", "12", "12"])
        expect(first.map(item => item.toString(16))).to.be.eql(["c", "3132", "c", "3132"])
    })
})
