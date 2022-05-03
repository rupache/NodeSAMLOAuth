/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const express = require("express");
const session = require("express-session")
const msal = require('@azure/msal-node');

/**
 * Command line arguments can be used to configure:
 * - The port the application runs on
 * - The cache file location
 * - The authentication scenario/configuration file name
 */
//const argv = require("../cliArgs");
const { request } = require("express");

const SERVER_PORT = 3000;
const cacheLocation = "./data/cache.json";
const cachePlugin = null;//require(cachePlugin)(cacheLocation);//require('../cachePlugin')(cacheLocation);

/**
 * The scenario string is the name of a .json file which contains the MSAL client configuration
 * For an example of what a configuration file should look like, check out the customConfig.json file in the
 * /config directory.
 * 
 * You can create your own configuration file and replace the path inside the "config" require statement below
 * with the path to your custom configuraiton.
 */
const scenario = "customConfig";
const config = require(`./config/${scenario}.json`);

const sessionConfig = {
    secret: 'CLIENT_SECRET_VALUE_NOT_THE_SECRET',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set this to true on production
    }
}

// Sample Application Code
const getTokenAuthCode = function (scenarioConfig, clientApplication, port) {
    // Set the port that the express server will listen on
    const serverPort = port || SERVER_PORT;
    // Create Express App and Routes
    const app = express();

    app.use(session(sessionConfig))

    const requestConfig = scenarioConfig.request;

    app.get("/", (req, res) => {
        const { authCodeUrlParameters } = requestConfig;

        const cryptoProvider = new msal.CryptoProvider()
            
        if (req.query) {
            // Check for the state parameter
            if(req.query.state) authCodeUrlParameters.state = req.query.state;
            // Check for nonce parameter
            /**
             * MSAL Node supports the OIDC nonce feature which is used to protect against token replay.
             * The CryptoProvider class provided by MSAL exposes the createNewGuid() API that generates random GUID
             * used to populate the nonce value if none is provided.
             * 
             * The generated nonce is then cached and passed as part of authCodeUrlParameters during authentication request.
             * 
             * For more information about nonce,
             * visit https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.5.3.2
             */

            if(req.query.nonce) {
                authCodeUrlParameters.nonce = req.query.nonce
            } else {
                authCodeUrlParameters.nonce = cryptoProvider.createNewGuid()
            }

            // Check for the prompt parameter
            if (req.query.prompt) authCodeUrlParameters.prompt = req.query.prompt;

            // Check for the loginHint parameter
            if (req.query.loginHint) authCodeUrlParameters.loginHint = req.query.loginHint;

            // Check for the domainHint parameter
            if (req.query.domainHint) authCodeUrlParameters.domainHint = req.query.domainHint;
        }

        req.session.nonce = authCodeUrlParameters.nonce //switch to a more persistent storage method.
        
        /**
         * MSAL Usage
         * The code below demonstrates the correct usage pattern of the ClientApplicaiton.getAuthCodeUrl API.
         * 
         * Authorization Code Grant: First Leg
         * 
         * In this code block, the application uses MSAL to obtain an authorization code request URL. Once the URL is
         * returned by MSAL, the express application is redirected to said request URL, concluding the first leg of the
         * Authorization Code Grant flow.
         */
        clientApplication.getAuthCodeUrl(authCodeUrlParameters).then((authCodeUrl) => {
            res.redirect(authCodeUrl);
        }).catch((error) => console.log(JSON.stringify(error)));
    });

    app.get("/redirect", (req, res) => {
        const tokenRequest = { ...requestConfig.tokenRequest, code: req.query.code };
        const authCodeResponse = { nonce: req.session.nonce, code: req.query.code }
        /**
         * MSAL Usage
         * The code below demonstrates the correct usage pattern of the ClientApplicaiton.acquireTokenByCode API.
         * 
         * Authorization Code Grant: Second Leg
         * 
         * In this code block, the application uses MSAL to obtain an Access Token from the configured authentication service.
         * The cached nonce is passed in authCodeResponse object and shall later be validated by MSAL once the Access Token and ID 
         * token are returned.
         * The response contains an `accessToken` property. Said property contains a string representing an encoded Json Web Token
         * which can be added to the `Authorization` header in a protected resource request to demonstrate authorization.
         */

        clientApplication.acquireTokenByCode(tokenRequest, authCodeResponse).then((response) => {
            console.log("Successfully acquired token using Authorization Code.");
            console.log(response);
            res.send(response.account.username);
        }).catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
    });

    return app.listen(serverPort, () => console.log(`Msal Node Auth Code Sample app listening on port ${serverPort}!`));
}



/**
 * The code below checks if the script is being executed manually or in automation.
 * If the script was executed manually, it will initialize a PublicClientApplication object
 * and execute the sample application.
 */
 if(true) {
    const loggerOptions = {
        loggerCallback(loglevel, message, containsPii) {
            console.log(message);
        },
            piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Verbose,
    }
    
    // Build MSAL ClientApplication Configuration object
    const clientConfig = {
        auth: config.authOptions,
        cache: {
            cachePlugin
        },
        // Uncomment the code below to enable the MSAL logger
        /*
         *   system: {
         *    loggerOptions: loggerOptions
         *   } 
         */
    };
    
    // Create an MSAL PublicClientApplication object 
    //const publicClientApplication = new msal.PublicClientApplication(clientConfig);

    // Execute sample application with the configured MSAL PublicClientApplication
    //return getTokenAuthCode(config, publicClientApplication, null);

    const confidentialClientApplication = new msal.ConfidentialClientApplication(clientConfig);
    return getTokenAuthCode(config, confidentialClientApplication, null);
 }

// The application code is exported so it can be executed in automation environments
 module.exports = getTokenAuthCode;