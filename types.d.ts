/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'yahoo-fantasy' {

	import type { IncomingMessage } from 'http';

	export interface YahooAuthResult {
		redirectUri?: string;
		status?: number;
		data?: any;
	}

	export interface YahooRefreshTokenResult {
		id_token?: string;
		access_token?: string;
		refresh_token?: string;
		expires_in: number;
	}

	export interface YahooAuthCallbackResult extends YahooRefreshTokenResult {
		state?: string;
	}

	export interface YahooUserInfo {
		birthdate: string;
		email: string;
		email_verified: boolean;
		family_name: string;
		gender: string;
		given_name: string;
		locale: string;
		name: string;
		nickname: string;
		picture: string;
		profile_images: {
			image128: string;
			image192: string;
			image32: string;
			image64: string;
		};
		sub: string;
	}

	class YahooFantasy {
		GET: 'GET';
		POST: 'POST';
		constructor(
			key: string,
			secret: string,
			onRefreshToken?: (...args: any[]) => void,
			redirectUri?: string
		);
		auth (callback: (result: YahooAuthResult) => void): void;
		auth (config: { state: string, scope: string; }, callback: (result: YahooAuthResult) => void): void;
		authCallback (
			request: any,
			callback: (error: Error, result: YahooAuthCallbackResult) => void
		): void;
		userInfo (callback: (error: Error, info?: YahooUserInfo) => void): void;
		setUserToken (token: string): void;
		setRefreshToken (refreshTokens: string): void;
		refreshToken (callback: (result: YahooRefreshTokenResult) => void);
		api (...args: any[]): Promise<any>;
		[key: string]: any;
	}

	export default YahooFantasy;

}
