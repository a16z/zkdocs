import { ZkDocConstraint, ZkDocSchema } from "zkdocs-lib";

interface ConstraintDisplayProps {
    constraint: ZkDocConstraint;
    schema: ZkDocSchema;
    fieldVals: string[];
}

export default function ConstraintDisplay(props: ConstraintDisplayProps) {
    let sFieldA = props.schema.getFieldByName(props.constraint.fieldA);
    let sFieldB = props.schema.getFieldByName(props.constraint.fieldB);

    let fieldAVal =
        props.fieldVals[props.schema.getFieldIndex(props.constraint.fieldA)];
    let fieldBVal =
        props.fieldVals[props.schema.getFieldIndex(props.constraint.fieldB)];

    let fieldCmpVal = props.constraint.constant
        ? props.constraint.constant.toString()
        : props.fieldVals[
              props.schema.getFieldIndex(props.constraint.fieldCompare!)
          ];

    return (
        <div className="grid grid-cols-3 py-2 border-b border-gray-200 last:border-none last:pb-0">
            <div>
                <span className="text-sm font-bold">
                    {sFieldA ? sFieldA.human_name : "..."}
                </span>
                <span>{"  "}</span>
                <span>{getOpDisplay(props.constraint)}</span>
                <span>{"  "}</span>
                <span className="text-sm font-bold">
                    {sFieldB ? sFieldB.human_name : "..."}
                </span>
                <span>{"  "}</span>
                <span>{getConstraintDisplay(props.constraint)}</span>
                <span>{"  "}</span>
                <span className="text-sm font-bold">
                    {props.constraint.constant
                        ? props.constraint.constant!
                        : props.schema.getFieldByName(
                              props.constraint.fieldCompare!
                          )?.human_name}
                </span>
            </div>
            <div className="px-6 text-center">
                {/* TODO: Spacing needs cleaning */}
                <span className="text-sm font-bold px-1">
                    {fieldAVal ? fieldAVal : "..."}
                </span>
                <span>{"  "}</span>
                <span>{getOpDisplay(props.constraint)}</span>
                <span>{"  "}</span>
                <span className="text-sm font-bold px-1">
                    {fieldBVal ? fieldBVal : "..."}
                </span>
                <span>{"  "}</span>
                <span>{getConstraintDisplay(props.constraint)}</span>
                <span>{"  "}</span>
                <span className="text-sm font-bold px-1 pt-1">
                    {fieldCmpVal}
                </span>
            </div>
            <div className="flex justify-end">
                {validateConstraint(
                    props.constraint,
                    fieldAVal,
                    fieldBVal,
                    fieldCmpVal
                ) ? (
                    <span className="rounded-md bg-green-400 px-2 text-md font-bold">
                        valid
                    </span>
                ) : (
                    <span className="rounded-md bg-red-400 px-2 text-md font-bold">
                        invalid
                    </span>
                )}
            </div>
        </div>
    );
}

function getConstraintDisplay(constraint: ZkDocConstraint): string {
    if (constraint.constraint === "LT") {
        return "<";
    } else if (constraint.constraint === "GT") {
        return ">";
    } else {
        return "?";
    }
}

function getOpDisplay(constraint: ZkDocConstraint): string {
    if (constraint.op === "ADD") {
        return "+";
    } else if (constraint.op === "SUB") {
        return "-";
    } else {
        return "?";
    }
}

function validateConstraint(
    constraint: ZkDocConstraint,
    fieldA: string,
    fieldB: string,
    fieldCmp: string
): boolean {
    let a = Number(fieldA);
    let b = Number(fieldB);
    let cmp = Number(fieldCmp);

    if (
        isNaN(+a) ||
        isNaN(+b) ||
        isNaN(+cmp) ||
        fieldA === "" ||
        fieldB === "" ||
        fieldCmp === ""
    ) {
        return false;
    }
    var mid;
    if (constraint.op === "ADD") {
        mid = a + b;
    } else if (constraint.op === "SUB") {
        mid = a - b;
    } else {
        console.error("unsupported op");
        return false;
    }

    if (constraint.constraint === "GT") {
        return mid > cmp;
    } else if (constraint.constraint === "LT") {
        return mid < cmp;
    } else {
        console.error("unsupported compare");
        return false;
    }
}
