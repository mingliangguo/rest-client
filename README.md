# README

A simple but powerful Rest API Client that can be used to talk with different REST service providers by simple extension.

The framework comes with two examples for [box.com](https://www.box.com) and [google.com](https://www.google.com). So it should be quite straightforward to follow and create REST client for other service providers.


# Quick start

For box, assume you have your own box application that can be used to talk with box service. Add your app information to config.ini.

```
BOX_CLIENT_ID=your_box_app_client_id
BOX_CLIENT_SECRET=your_box_app_client_secret
BOX_TOKEN_JSON_FILE=examples/box/box-tokens.json
```

Once you have the app information configured, start with the oauth process:

```
npm run box -- --action=oauth
```

It should launch a browser window to ask you authorize the app, and after the authorization is done, make sure you have redirect url configured for your app, to receive the authorization code. Copy the code, and use it in the following command:

```
npm run box -- --action=token --code=your_oauth_code
```

Once the token action completes, it saves the token in the token file (configured in config.ini).

There are some pre-configured actions in the sample implementation, and it should be pretty straightforward to add other actions for your own need.

> Note, you can do the same for google rest services.

```
npm run google -- --action=oauth
npm run google -- --action=token --code=your_oauth_code
```

# Logging output

The Rest Client uses [winston](https://github.com/winstonjs/winston) as the logging framework, and use LOG_LEVEL environment variable to control the logout. For example:

```
LOG_LEVEL=debug npm run box -- --action=user --uid=me
```
