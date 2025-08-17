/* global module, require */
import https from "https";
import { stringify } from "querystring";
import crypto from "crypto";
// TODO: we can remove this fairly easily: https://medium.com/@pandeysoni/how-to-create-oauth-1-0a-signature-in-node-js-7d477dead170
// just make sure that each param is fully encoded (ie/ format=json not just the json piece)
import oauthSignature from "oauth-signature";

import {
  Game,
  League,
  Player,
  Roster,
  Team,
  Transaction,
  User,
} from "./resources/index.mjs";

import {
  Games,
  Leagues,
  Players,
  Teams,
  Transactions,
} from "./collections/index.mjs"; // Users } from "./collections";

import {
  tryParseJSON,
  toSearchParams
} from './helpers/requestHelper.mjs';

class YahooFantasy {
  // redirect only needed if you're handling the auth with this lib
  constructor(consumerKey, consumerSecret, tokenCallbackFn, redirectUri) {
    this.CONSUMER_KEY = consumerKey;
    this.CONSUMER_SECRET = consumerSecret;
    this.REDIRECT_URI = redirectUri;

    this.refreshTokenCallback = () => { };

    if (tokenCallbackFn) {
      this.refreshTokenCallback = tokenCallbackFn;
    }

    this.GET = "GET";
    this.POST = "POST";

    this.game = new Game(this);
    this.games = new Games(this);

    this.league = new League(this);
    this.leagues = new Leagues(this);

    this.player = new Player(this);
    this.players = new Players(this);

    this.team = new Team(this);
    this.teams = new Teams(this);

    this.transaction = new Transaction(this);
    this.transactions = new Transactions(this);

    this.roster = new Roster(this);

    this.user = new User(this);
    // this.users = new Users(); // TODO

    this.yahooAccessToken = null;
    this.yahooRefreshToken = null;
    this.yahooIdToken = null;
  }

  // oauth2 authenticatiocn function -- follow redirect to yahoo login
  auth(configOrCallback, cb) {

    let config = {};

    if (typeof configOrCallback === 'function') {
      cb = configOrCallback;
    }
    else {
      config = configOrCallback || {};
    }

    if (!cb)
      throw new Error(`Auth callback is required but got undefined.`);

    const { state, scope } = config;

    const params = {
      client_id: this.CONSUMER_KEY,
      redirect_uri: this.REDIRECT_URI,
      response_type: "code",
    };

    if (state) {
      params.state = state;
    }

    if (scope) {
      params.scope = scope
    }

    const options = {
      hostname: "api.login.yahoo.com",
      port: 443,
      path: `/oauth2/request_auth?${toSearchParams(params)}`,
      method: "GET",
    };

    const authRequest = https.request(options, (authResponse) => {
      let data = '';
      authResponse.on("data", (chunk) => {
        if (chunk)
          data += chunk;
      });

      authResponse.on("end", () => {
        cb(null, {
          status: authResponse.statusCode,
          redirectUri: authResponse.headers.location,
          data,
        })
      });
    });

    authRequest.on("error", (e) => {
      cb(e);
    });

    authRequest.end();
  }

  authCallback(req, cb) {

    const params = {
      client_id: this.CONSUMER_KEY,
      client_secret: this.CONSUMER_SECRET,
      redirect_uri: this.REDIRECT_URI,
      code: req.query.code,
      grant_type: "authorization_code",
    };

    let state = req.query.state;

    if (state) {
      params.state = state;
    }

    const options = {
      hostname: "api.login.yahoo.com",
      port: 443,
      path: `/oauth2/get_token`,
      method: this.POST,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${this.CONSUMER_KEY}:${this.CONSUMER_SECRET}`
        ).toString("base64")}`,
      },
    };

    const tokenRequest = https.request(options, (tokenReponse) => {

      const chunks = [];

      tokenReponse.on("data", (chunk) => {
        if (chunk)
          chunks.push(chunk);
      });

      tokenReponse.on("end", async () => {
        const data = tryParseJSON(chunks);
        const { access_token, refresh_token, id_token } = data;

        this.yahooAccessToken = access_token;
        this.yahooRefreshToken = refresh_token;
        this.yahooIdToken = id_token;

        if (this.refreshTokenCallback) {
          // run the callback before moving on
          await this.refreshTokenCallback({
            access_token,
            refresh_token,
          });
        }

        cb(null, { ...data, state });
      });
    });

    tokenRequest.on("error", (e) => {
      cb(e);
    });

    // tokenRequest.write(stringify(tokenData));
    tokenRequest.write(toSearchParams(params));
    tokenRequest.end();
  }

  userInfo(cb) {

    const params = toSearchParams({ id_token: this.yahooIdToken });

    const options = {
      hostname: "api.login.yahoo.com",
      port: 443,
      path: `/openid/v1/userinfo?${params}`,
      method: "GET",
      headers: {
        host: 'api.login.yahoo.com',
        Authorization: `Bearer ${this.yahooAccessToken}`
      }
    };

    const authRequest = https.request(options, (authResponse) => {

      const chunks = [];

      authResponse.on("data", (chunk) => {
        if (chunk)
          chunks.push(chunk);
      });

      authResponse.on("end", () => {
        const json = tryParseJSON(chunks);
        cb(null, json);
      });
    });

    authRequest.on("error", (e) => {
      cb(e);
    });

    authRequest.end();
  }

  setUserToken(token) {
    this.yahooAccessToken = token;
  }

  setRefreshToken(token) {
    this.yahooRefreshToken = token;
  }

  setIdToken(token) {
    this.yahooIdToken = token;
  }

  refreshToken(cb) {

    const params = toSearchParams({
      grant_type: "refresh_token",
      redirect_uri: this.REDIRECT_URI,
      refresh_token: this.yahooRefreshToken,
    });

    const options = {
      hostname: "api.login.yahoo.com",
      port: 443,
      path: "/oauth2/get_token",
      method: this.POST,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${this.CONSUMER_KEY}:${this.CONSUMER_SECRET}`
        ).toString("base64")}`,
      },
    };

    const tokenRequest = https.request(options, (tokenReponse) => {

      const chunks = [];

      tokenReponse.on("data", (chunk) => {
        if (chunk)
          chunks.push(chunk);
      });

      tokenReponse.on("end", async () => {
        const tokenData = tryParseJSON(chunks);

        this.setUserToken(tokenData.access_token);
        this.setRefreshToken(tokenData.refresh_token);

        // run the callback before moving on
        if (this.refreshTokenCallback)
          await this.refreshTokenCallback(tokenData);

        cb(null, tokenData);
      });
    });

    tokenRequest.on("error", (e) => {
      cb(e);
    });

    tokenRequest.write(params);
    tokenRequest.end();
  }

  api(...args) {
    const method = args.shift();
    const url = args.shift();
    let postData = false;

    if (args.length && args[0]) {
      postData = args.pop();
    }

    let params = {
      format: "json",
    };

    const headers = {};

    if (!this.yahooAccessToken) {
      params = {
        ...params,
        oauth_consumer_key: this.CONSUMER_KEY,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor(Date.now() / 1000),
        oauth_nonce: crypto.randomBytes(12).toString("base64"),
        oauth_version: "1.0",
      };

      const signature = oauthSignature.generate(
        method,
        url,
        params,
        this.CONSUMER_SECRET
      );

      params = {
        ...params,
        oauth_signature: decodeURIComponent(signature),
      };
    } else {
      headers.Authorization = `Bearer ${this.yahooAccessToken}`;
    }

    const options = {
      hostname: "fantasysports.yahooapis.com",
      path: `${url.replace(
        "https://fantasysports.yahooapis.com",
        ""
      )}?${toSearchParams(params)}`,
      method: method,
      headers,
    };

    return new Promise((resolve, reject) => {
      https
        .request(options, (resp) => {
          const chunks = [];

          resp.on("data", (chunk) => {
            if (chunk)
              chunks.push(chunk);
          });

          resp.on("end", () => {
            const json = tryParseJSON(chunks);

            if (json.error) {
              if (/"token_expired"/i.test(json.error.description)) {
                return this.refreshToken((err, data) => {
                  if (err) {
                    return reject(err);
                  }

                  return resolve(this.api(method, url, postData));
                });
              } else {
                return reject(json.error);
              }
            }

            return resolve(json);
          });
        })
        .on("error", (err) => {
          return reject(err.message);
        })
        .end();
    });
  }
}

export default YahooFantasy;
