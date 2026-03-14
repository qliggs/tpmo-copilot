import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const expectedUsername = process.env.AUTH_USERNAME;
        const expectedPassword = process.env.AUTH_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
          throw new Error("AUTH_USERNAME and AUTH_PASSWORD must be set");
        }

        if (
          credentials?.username === expectedUsername &&
          credentials?.password === expectedPassword
        ) {
          return { id: "1", name: expectedUsername };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const protectedPaths = ["/chat", "/admin", "/dashboard"];
      const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );

      if (isProtected && !isLoggedIn) {
        return false; // redirects to signIn page
      }

      return true;
    },
  },
});
