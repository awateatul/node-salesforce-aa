let request = require('request');
// request.debug = true;

// Salesforce parameters. Will be overwritten when the module is inited by caller.
let clientId = 'overwritten_when_required';
let clientSecret = '';
let v = '36.0';

// Init function for module
let SF = function(_clientId, _clientSecret, _v) {
    clientId = _clientId;
    clientSecret = _clientSecret;
    v = _v;
};

// First step in login/auth process. Refer to salesforce documentation for detailed explanation
// Your clients will be sent here.
// state: Value sent back when salesforce redirects to user provided url after getting code.
// redirectUri: Where you would like salesforce to send the code url request.
// display: Type of display for authentication. Default is popup.
// return: Salesforce login url with parameters
SF.prototype.getCodeUrl = function(state, redirectUri, display='popup') {
    return 'https://login.salesforce.com/services/oauth2/authorize?' +
        `client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=${state}&display=${display}`;
}

// Get access token to make future calls to salesforce apis.
// return: Promise with salesforce response.
SF.prototype.getToken = function(code, redirectUri) {
    let params = {
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret
    }
    return new Promise((resolve, reject) => {
        request.post({
            url: 'https://login.salesforce.com/services/oauth2/token',
            form:params,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }, handleResponse.bind(null, resolve, reject));
    });
}

// The access token sent by salesforce expires after some time interval.
// Use the existing refresh token to get a new access token, so you don't have
// to ask your users to authenticate again.
// return: Promise with salesforce response.
SF.prototype.getTokenUsingRefreshToken = function(refreshToken) {
    let params = {
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret
    };
    return new Promise((resolve, reject) => {
        request.post({
            url: 'https://login.salesforce.com/services/oauth2/token',
            form:params,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }, handleResponse.bind(null, resolve, reject));
    })

}

// Run queries against salesforce using the token and the instance for a given client
// return: Promise with salesforce response.
SF.prototype.query = function(query, instance, token) {
    let url = instance + '/services/data/' + v + '/query';
    let qs = {q: query}
    return new Promise((resolve, reject) => {
        request({
            url: url,
            qs: qs,
            headers: {
                "Authorization": "Bearer " + token
            },
            method: 'GET'
        }, handleResponse.bind(null, resolve, reject));
    })
}

// Get a list of available salesforce objects
// return: Promise with salesforce response.
SF.prototype.sobjects = function(instance, token) {
    let url = instance + '/services/data/' + v + '/sobjects';
    return new Promise((resolve, reject) => {
        request({
            url: url,
            headers: {
                "Authorization": "Bearer " + token
            },
            method: 'GET'
        }, handleResponse.bind(null, resolve, reject));
    })
}

// Get the information about your client using the url received when auth was requested
// return: Promise with salesforce response.
SF.prototype.my_id = function(token, myidUrl) {
    let url = myidUrl;
    return new Promise((resolve, reject) => {
        request({
            url: url,
            headers: {
                "Authorization": "Bearer " + token
            },
            method: 'GET'
        }, handleResponse.bind(null, resolve, reject));
    })
}

// Create salesforce contact.
// return: Promise with salesforce response.
SF.prototype.createContact = function(contact, token, instance) {
    let url = instance + '/services/data/' + v + '/sobjects/Contact/';
    return new Promise((resolve, reject) => {
        request.post({
            url: url,
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            json: contact
        }, handleResponse.bind(null, resolve, reject));
    });
}

// Update salesforce contact for given contact id.
// return: Promise with salesforce response.
SF.prototype.updateContact = function(patch, contactId, token, instance) {
    let url = instance + '/services/data/' + v + '/sobjects/Contact/' + contactId;
    return new Promise((resolve, reject) => {
        request.patch({
            url: url,
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            json: patch
        }, handleResponse.bind(null, resolve, reject));
    });
}

module.exports = function(_clientId, _clientSecret, _v) {
    return new SF(_clientId, _clientSecret, _v);
};

// Promisify and send the results
function handleResponse(resolve, reject, error, response, body) {
    if(error) {
        reject(error);
    } else {
        if(typeof body !== 'object') {
            if(!body || body.trim() === '') {
                body={}; // If body is empty send and empty object
            } else {
                body = JSON.parse(body); // Send JSON object
            }

        }
        resolve({response: response, body: body});
    }
}