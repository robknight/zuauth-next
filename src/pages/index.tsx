import AuthButton from "@/components/AuthButton";
import { withIronSessionSsr } from "iron-session/next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback } from "react";

export default function Home({ user }: { user: string }) {
  const router = useRouter();
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout");
    router.replace(router.asPath);
  }, [router]);
  const onAuth = useCallback(() => {
    router.replace(router.asPath);
  }, [router]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Head>
        <title>Zupass Auth Example</title>
      </Head>
      <div className="max-w-xl w-full">
        <h1 className="my-8 text-xl font-semibold">Login Example</h1>
        <div className="my-8">
          {!user && <AuthButton onAuth={onAuth} />}
          {user && (
            <button
              className="rounded border-1 border-solid ring-1 ring-slate-500 border-slate-200 bg-slate-700 text-slate-100 hover:bg-slate-800 py-1 px-4"
              onClick={logout}
            >
              Log out
            </button>
          )}
        </div>
        <div>User: {JSON.stringify(user)}</div>
        <div className="mt-20">
          <a
            href="https://github.com/robknight/zuauth-next"
            className="underline"
          >
            Source
          </a>
        </div>
      </div>
    </main>
  );
}

export const getServerSideProps = withIronSessionSsr(
  async function getServerSideProps({ req }) {
    const user = req.session.user;

    return {
      props: {
        user: user ?? null
      }
    };
  },
  {
    cookieName: process.env.SESSION_COOKIE_NAME as string,
    password: process.env.SESSION_PASSWORD as string,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production"
    }
  }
);
