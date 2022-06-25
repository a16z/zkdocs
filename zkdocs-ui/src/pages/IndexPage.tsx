import { Link } from "react-router-dom";
import {
    ClipboardListIcon,
    LibraryIcon,
    CollectionIcon,
} from "@heroicons/react/solid";

export default function IndexPage() {
    return (
        <div className="m-10">
            <div className="grid md:grid-cols-2 sm:grid-cols-1">
                <Link to="/form-fill" className="m-4">
                    <div className="rounded-md bg-blue-100 hover:bg-blue-300 active:bg-blue-400 p-4 inline-flex items-center justify-center w-full text-gray-700">
                        <div className="">
                            <ClipboardListIcon className="w-20 h-20"></ClipboardListIcon>
                            <div className="text-md font-medium">Fill Form</div>
                        </div>
                    </div>
                </Link>

                <Link to="/submit-proof" className="m-4">
                    <div className="rounded-md bg-blue-100 hover:bg-blue-300 active:bg-blue-400 p-4 inline-flex items-center justify-center w-full text-gray-700">
                        <div>
                            <LibraryIcon className="w-20 h-20 ml-2"></LibraryIcon>
                            <div className="text-md font-medium">
                                Verify Form
                            </div>
                        </div>
                    </div>
                </Link>

                <Link to="/list-verified-submitters" className="m-4">
                    <div className="rounded-md bg-blue-100 hover:bg-blue-300 active:bg-blue-400 p-4 inline-flex items-center justify-center w-full text-gray-700">
                        <div>
                            <CollectionIcon className="w-20 h-20 ml-2"></CollectionIcon>
                            <div className="text-md font-medium">
                                View Verified
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
