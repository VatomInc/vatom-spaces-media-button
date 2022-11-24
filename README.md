# Media Button Plugin

This plugin is designed to be used from within [Vatom Spaces](https://vatom.com).


## Development

- Ensure you have [Node](https://nodejs.org) installed
- Install dependencies with `npm install`
- Login to the Vatom CLI with `npm run login`
- Build and load the plugin into your space with `npm run sideload -- myspace` (replace `myspace` with your space alias name)
- When ready, publish to the Marketplace with `npm run publish`

> **Note:** You can only sideload plugins in a space you are the owner of.

## Use

- Install plugin
- Create Media Player
- Add any object
- Attach "Media Button" component to it
- Specify ID or Name of media player inside media button component (Otherwise it will just use the closet media player to it)
- Add media source to media button
- Specify any other relevant settings
- That's it! Clicking on that object will start playing the specified media source on the media player (from the beginning)