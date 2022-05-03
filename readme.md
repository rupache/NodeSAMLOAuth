# MSAL Node Sample:  Auth Code

This sample application works for both Azure AD users as well as external users. Make sure to add client secret value to the custom config JSON file.

### How is this used?

<ol>
<li>Create an app and make sure to create following from the app registration service on Azure portal.</li>
<li>Application (client) ID</li>
  <li>Redirect URIs and make sure you select web not SPA</li>
<li>Create new client certificate and make sure to have proper expiry and use the value field in the code custom config and index.js
  Have proper redirect URIs</li>
</ol>
