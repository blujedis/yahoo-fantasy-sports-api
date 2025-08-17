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

    const request = https.request(options, (response) => {

      let chunks = [];

      response.on("data", (chunk) => {

        if (chunk)
          chunks.push(chunk);

      });

      response.on("end", () => {

        const data = tryParseJSON(chunks);

        if (data.error)
          return cb(new Error(data.error + ': ' + data.error_description || ''));

        cb(null, {
          status: response.statusCode,
          redirectUri: response.headers.location,
          data,
        })

      });
    });

    request.on("error", (e) => {
      cb(e);
    });

    request.end();
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

    const request = https.request(options, (response) => {

      const chunks = [];

      response.on("data", (chunk) => {
        if (chunk)
          chunks.push(chunk);
      });

      response.on("end", async () => {

        const data = tryParseJSON(chunks);

        if (data.error)
          return cb(new Error(data.error + ': ' + data.error_description || ''));

        const { access_token, refresh_token, id_token } = data;

        this.yahooAccessToken = access_token;
        this.yahooRefreshToken = refresh_token;
        this.yahooIdToken = id_token;

        if (this.refreshTokenCallback) {
          // run the callback before moving on
          await this.refreshTokenCallback({
            access_token,
            refresh_token,
            id_token
          });
        }

        cb(null, { ...data, state });

      });
    });

    request.on("error", (e) => {
      cb(e);
    });

    // tokenRequest.write(stringify(tokenData));
    request.write(toSearchParams(params));
    request.end();
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

    const request = https.request(options, (response) => {

      const chunks = [];

      response.on("data", (chunk) => {
        if (chunk)
          chunks.push(chunk);
      });

      response.on("end", () => {
        const data = tryParseJSON(chunks);

        if (data.error) {

          if (/"token_expired"/i.test(data.error.description || '')) {
            return this.refreshToken((err, data) => {
              if (err)
                return cb(err);
              return this.userInfo(cb);
            });
          }

          cb(new Error(data.error + ': ' + data.error_description || ''));

        }

        cb(null, data);

      });
    });

    request.on("error", (e) => {
      cb(e);
    });

    request.end();
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

    const request = https.request(options, (response) => {

      const chunks = [];

      response.on("data", (chunk) => {
        if (chunk)
          chunks.push(chunk);
      });

      response.on("end", async () => {
        const data = tryParseJSON(chunks);

        if (data.error)
          return cb(new Error(data.error + ': ' + data.error_description || ''));

        this.setUserToken(data.access_token);
        this.setRefreshToken(data.refresh_token);

        // run the callback before moving on
        if (this.refreshTokenCallback)
          await this.refreshTokenCallback({ ...data, id_token: data.id_token || this.yahooIdToken });

        cb(null, data);
      });
    });

    request.on("error", (e) => {
      cb(e);
    });

    request.write(params);
    request.end();
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
            const data = tryParseJSON(chunks);

            if (data.error) {
              if (/"token_expired"/i.test(data.error.description)) {
                return this.refreshToken((err, data) => {
                  if (err) {
                    return reject(err);
                  }
                  return resolve(this.api(method, url, postData));
                });
              }
              else {
                return reject(data.error);
              }
            }

            return resolve(data);
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
