import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function SideNav() {
const session = useSession();
const user = session.data?.user;

    return <nav className="sticky top-0 px-2 py-4 bg-neutral-500 w-full">
        <ul className="flex flex-col overflow-hidden">
            <li>
                <Link href="/">Home</Link>
            </li>
            
            {user != null ? (
                <div> {/* why do I need this div? */}
                    <li>
                        <Link 
                            href="/new_league"
                            className=" transition-colors duration-200 hover:bg-green-500 
                        bg-green-700 text-center text-white shadow-sm ">New League
                        </Link>
                    </li>
                    <li>
                        <button onClick={() => void signOut()}>Log Out</button>
                    </li>
                </div>
            ) : null}
            {user == null ? (
                <li>
                    <button onClick={() => void signIn()}>Log In</button>
                </li>
            ) : null}
            
        </ul>
    </nav>
}