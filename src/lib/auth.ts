import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import crypto from 'crypto';
import { getDb, COLLECTIONS } from './db';
import { ObjectId } from 'mongodb';

declare module 'next-auth' {
    interface User {
        id: string;
        role: 'client' | 'admin' | 'superadmin';
        accountStatus?: string;
    }
    interface Session {
        user: User & {
            id: string;
            role: 'client' | 'admin' | 'superadmin';
            accountStatus?: string;
        };
    }
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 8 * 60 * 60, // 8 hours for clients
    },
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
            },
        },
    },
    providers: [
        CredentialsProvider({
            id: 'client-credentials',
            name: 'Client',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Mot de passe', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const db = await getDb();
                const user = await db.collection(COLLECTIONS.USERS).findOne({
                    email: credentials.email.toLowerCase(),
                });

                if (!user) return null;

                // Verify password using bcryptjs
                let valid = false;
                try {
                    const bcrypt = require('bcryptjs');
                    valid = await bcrypt.compare(credentials.password, user.passwordHash);
                } catch {
                    return null;
                }

                if (!valid) return null;

                // Update last login
                await db.collection(COLLECTIONS.USERS).updateOne(
                    { _id: user._id },
                    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
                );

                return {
                    id: user._id.toString(),
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: 'client',
                    accountStatus: user.status,
                };
            },
        }),

        CredentialsProvider({
            id: 'admin-credentials',
            name: 'Admin',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Mot de passe', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const db = await getDb();
                const admin = await db.collection(COLLECTIONS.ADMIN_USERS).findOne({
                    email: credentials.email.toLowerCase(),
                    active: true,
                });

                if (!admin) return null;

                let valid = false;
                try {
                    const bcrypt = require('bcryptjs');
                    valid = await bcrypt.compare(credentials.password, admin.passwordHash);
                } catch {
                    return null;
                }

                if (!valid) return null;

                // 2FA has been explicitly removed by user request

                await db.collection(COLLECTIONS.ADMIN_USERS).updateOne(
                    { _id: admin._id },
                    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
                );

                return {
                    id: admin._id.toString(),
                    name: admin.name,
                    email: admin.email,
                    role: admin.role as 'admin' | 'superadmin',
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.accountStatus = user.accountStatus;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as 'client' | 'admin' | 'superadmin';
                session.user.accountStatus = token.accountStatus as string | undefined;
            }
            return session;
        },
    },
    pages: {
        signIn: '/connexion',
        error: '/connexion',
    },
};
