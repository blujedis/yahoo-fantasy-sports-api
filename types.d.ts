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
		access_token?: string;
		refresh_token?: string;
	}

	export interface YahooAuthCallbackResult extends YahooRefreshTokenResult {
		id_token?: string;
		token_type?: string;
		expires_in: number;
		state?: string;
		error?: string;
		error_description?: string;
	}

	export interface YahooUserInfoResult {
		status: number;
		data: any;
	}

	export type YahooCallback<T> = (error: null | Error, result: T) => void;

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
