import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import Head from "next/head";
//import { SideNav } from "~/components/SideNav";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>Simple Baseball GM</title>
        <meta name="a simple baseball management game" content="created by Ian Terry" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto bg-[url('/img/overlapping-diamonds.svg')] h-full">
        <div className="flex flex-row flex-wrap h-full ">
          {/*
          <aside className="w-full sm:w-1/6 lg:w-1/12 px-2 ">
            {/*<SideNav />}
          </aside>  */}
          <main className="w-full h-full mx-auto  ">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
