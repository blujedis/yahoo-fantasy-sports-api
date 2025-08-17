/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'yahoo-fantasy' {

	export interface YahooAuthResult {
		redirectUri?: string;
		status: number;
		data?: any;
	}

	export interface ResponseObject {
		redirect: (location: string) => void;
		send: (data: any) => void;
	}

	export interface YahooRefreshTokenResult {
		access_token: string;
		refresh_token: string;
		id_token: string;
	}

	export interface YahooAuthCallbackResult extends YahooRefreshTokenResult {
		token_type: string;
		expires_in: number;
		state?: string;
	}

	export interface YahooUserInfoResult {
		status: number;
		data: any;
	}

	export type YahooCallback<T> = (error: null | Error, result: T) => void;

	export interface YahooUserInfo {
		sub: string;
		name: string;
		given_name: string;
		family_name: string;
		nickname: string;
		locale: string;
		email: string;
		email_verified: boolean;
		profile_images: {
			image128: string;
			image192: string;
			image32: string;
			image64: string;
		};
		picture: string;
		gender: string;
		birthdate: string;
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
		auth (cb: YahooAuthHandler): void;
		auth (config: { state?: string, scope?: string; }, cb: YahooCallback<YahooAuthResult>): void;
		authCallback (request: any, cb: YahooCallback<YahooAuthCallbackResult>): void;
		userInfo (cb: YahooCallback<YahooUserInfo>): void;
		setUserToken (accessToken: string): void;
		setRefreshToken (refreshToken: string): void;
		setIdToken (idToken: string): void;
		refreshToken (callback: (result: YahooRefreshTokenResult) => void);
		api (...args: any[]): Promise<any>;
		[key: string]: any; // fallback until more types are created.
	}

	export default YahooFantasy;

}
