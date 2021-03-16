var github_tokens = {}
Object.entries(process.env).forEach(([key, value]) => {
  if (key.indexOf('GITHUB_TOKEN_') === 0) {
    github_tokens[key] = {
      remining_rate: null,
      credential: value
    }
  }
});

console.log("Found " + Object.keys(github_tokens).length + " tokens")

module.exports = {
  summary: 'GitHub token injector',
  github_tokens,
  *beforeSendRequest(requestDetail) {
    if (requestDetail.url.indexOf('https://api.github.com') === 0) {
    //if (requestDetail.url.indexOf('http://httpbin.org') === 0) {
      const newRequestOptions = requestDetail.requestOptions;

      const rule_module = require('./rule.js')
      const github_tokens = rule_module.github_tokens

      var selectedtoken = null
      var BreakException = {};
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
      rule_module.github_tokens[used_token_name].remining_rate=newResponse.header['X-RateLimit-Remaining']||60
      return {
        response: newResponse
      };
    }
  },
};
