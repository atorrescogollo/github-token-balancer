var github_tokens = {}
Object.entries(process.env).forEach(([key, value]) => {
  if (key.indexOf('GITHUB_TOKEN_') === 0) {
    github_tokens[key] = {
      remining_rate: null,
      credential: value
    }
  }
});

console.log("Found " + Object.keys(github_tokens).length + " tokens to balance")

module.exports = {
  summary: 'GitHub token injector',
  github_tokens,
  *beforeSendRequest(requestDetail) {
    var BreakException = {};
    if (process.env.BASIC_AUTH){
      // https://github.com/alibaba/anyproxy/issues/71#issuecomment-636023995
      if (!requestDetail || !requestDetail._req.headers || !requestDetail._req.headers["Proxy-Authorization"]) {
        return {
            response: {
                statusCode: 401,
                header: { 'Proxy-Authenticate': 'Basic' }
            }
        }
      }
      else {
        // Received credentials
        let auth = requestDetail._req.headers["Proxy-Authorization"];
        auth = auth.split(" ");
        const Base64 = require('js-base64').Base64;
        auth = Base64.decode(auth[1]);
        auth = auth.split(":");
        let username = auth[0];
        let password = auth[1];

        // Allowed credentials (ACL with env var BASIC_AUTH)
        proxy_auth_creds = process.env.BASIC_AUTH.split(";")
        try {
          proxy_auth_creds.forEach(function(cred_raw){
            cred = cred_raw.split(':')
            allowed_user = cred[0]
            allowed_pass = cred[1]
            if (username === allowed_user && password === allowed_pass){
              throw BreakException
            }
          });
          console.log("Authentication error for user \"" + username + "\"")
          return {
            response: {
                statusCode: 401,
                header: { 'Proxy-Authenticate': 'Basic' }
            }
          }
        } catch (e) {
          if (e !== BreakException) throw e;
        }
      }
    }

    if (requestDetail.url.indexOf('https://api.github.com') === 0) {
    //if (requestDetail.url.indexOf('http://httpbin.org') === 0) {
      const newRequestOptions = requestDetail.requestOptions;

      const rule_module = require('./rule.js')
      const github_tokens = rule_module.github_tokens

      var selectedtoken = null
      try {
        Object.entries(github_tokens).forEach(([token_name, token]) => {
          if (
            !selectedtoken ||
            (!token.remining_rate && selectedtoken.remining_rate) ||
            selectedtoken.remining_rate < token.remining_rate
          ) {
            // Cred not selected yet or candidate token has greater remining rate
            selectedtoken = {
              name: token_name,
              credential: token.credential,
              remining_rate: token.remining_rate
            }
            if (!selectedtoken.remining_rate){
              throw BreakException
            }
          }
        });
      } catch (e) {
        if (e !== BreakException) throw e;
      }
      rule_module.selectedtoken_name = selectedtoken.name
      newRequestOptions.headers['Authorization'] = 'token ' + selectedtoken.credential;
      console.log("Incomming request for URL \"" + requestDetail.url + "\". Using token \""+ selectedtoken.name +"\"")
      return {
        requestOptions: newRequestOptions
      };
    }
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    if (requestDetail.url.indexOf('https://api.github.com') === 0) {
    //if (requestDetail.url.indexOf('http://httpbin.org') === 0) {
      const newResponse = responseDetail.response;
      const rule_module = require('./rule.js')
      used_token = requestDetail.requestOptions.headers.Authorization.split(" ")[1]
      var BreakException = {};
      used_token_name = null
      try {
        Object.entries(github_tokens).forEach(([token_name, token]) => {
          if (used_token == token.credential){
            used_token_name = token_name
            throw BreakException
          }
        });
      } catch (e) {
        if (e !== BreakException) throw e;
      }
      remining_rate=newResponse.header['X-RateLimit-Remaining']||60
      rule_module.github_tokens[used_token_name].remining_rate=remining_rate
      console.log("Token \"" + used_token_name + "\" -> X-RateLimit-Remaining="+remining_rate)
      return {
        response: newResponse
      };
    }
  },
};
