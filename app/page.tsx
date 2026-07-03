import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "./components/sign-out-button";
import db from "@/lib/db";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const allUsers = db.query("SELECT * FROM users").all();

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          Users - SQLite with Bun
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-zinc-400">
            {session.user?.email}
          </span>
          <SignOutButton />
        </div>
      </div>

      <div>
        <h2 className="text-blue-600 dark:text-blue-400">All records:</h2>
        <pre className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200 p-4 rounded font-mono text-sm leading-snug">
          {JSON.stringify(allUsers, null, 2)}
        </pre>
      </div>
    </div>
  );
}
