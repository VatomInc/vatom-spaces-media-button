import { BasePlugin, BaseComponent } from 'vatom-spaces-plugins'

/**
 * This is the main entry point for your plugin.
 *
 * All information regarding plugin development can be found at
 * https://developer.vatom.com/spaces/plugins-in-spaces/guide-create-plugin
 *
 * @license MIT
 * @author Vatom Inc.
 */
export default class MediaButtonPlugin extends BasePlugin {

    /** Plugin info */
    static id = "media-button"
    static name = "Media Button"
    static description = "Allows the creation of media buttons that will quickly change the source of a media player"

    /** Called on load */
    onLoad() {

        // Register button as an attachable component
        this.objects.registerComponent(MediaButton, {
            id: 'media-button',
            name: 'Media Button',
            description: 'Converts this object into a media player.',
            settings: obj => [
                { id: 'info', type: 'label', value: 'Allows this object to control another media player.' },
                { id: 'select-name', name: 'Select Via Name', type: 'checkbox', help: 'When enabled, it allows for selection of the media player by its name rather than identifier.' },
                this.getComponentField(obj, 'media-button', 'select-name') == true
                    ? { id: 'media-player-name', name: 'Media Player Name', type: 'select-item', help: 'Name of the media player object. Leaving this blank will default button to nearest media player (within 20 metres).' }
                    : { id: 'media-player-id', name: 'Media Player ID', type: 'input', help: 'Identifier of the media player object. Leaving this blank will default button to nearest media player (within 20 metres).' },
                { id: 'media-source-id', name: 'Media Source URL', type: 'input', help: 'URL for the media source you wish to play with this button.' },
                { id: 'who-can-click', name: 'Who Can Use', type: 'select', default: 'Everyone', values: ['Everyone', 'Admin Only'], help: 'Type of user who is allowed to click on the media button. Default is Everyone.' },
                { id: 'event-name', name: 'Event Name', type: 'text', help: 'If set, this button will record analytics events for the attached video using the given event name.' },
            ]
        })

    }

}

/**
 * Component that allows an object to be used as a media button.
 */
class MediaButton extends BaseComponent {

    /** Called when the button is clicked */
    async onClick() {

        // Stop if set to admin only and user is not admin
        const isAdmin = await this.plugin.user.isAdmin()
        if (this.getField('who-can-click') == "Admin Only" && !isAdmin) {
            return
        }

        // Get media button settings
        const usingName = this.getField('select-name') == true
        const mediaSourceURL = this.getField('media-source-id')
        let mediaPlayerID = usingName ? this.getField('media-player-name') : this.getField('media-player-id')

        // Attempt to find nearest media player if no identifier given
        if (!mediaPlayerID) {
            try {
                const button = await this.plugin.objects.get(this.objectID)
                const nearbyObjects = await this.plugin.objects.fetchInRadius(button.x, button.y, 20)
                let foundDistance = 0
                let mediaPlayer = null

                // Find nearest object
                for (let object of nearbyObjects) {
                    let position = { x: object.x || 0, y: object.y || 0 }
                    let distance = Math.sqrt((position.x - button.x) ** 2 + (position.y - button.y) ** 2)
                    let isMediaPlayer = false

                    // Check if this object has a media source component
                    if (object.components) {
                        isMediaPlayer = object.components.findIndex(comp => comp.id == 'media-playback:media-source') >= 0

                        if ((!mediaPlayer || foundDistance > distance) && isMediaPlayer) {
                            mediaPlayer = object
                            foundDistance = distance
                        }
                    }
                }

                // Found a media player nearby, so use it
                if (mediaPlayer) {
                    mediaPlayerID = mediaPlayer.id
                }
            } catch (err) {
                console.error('[MediaButton] Failed to find nearest media player.', err)
                this.plugin.menus.alert('Failed to find nearest media player.', 'Error', 'error')
                return
            }
        }

        // Cannot continue with relevant information
        if (!mediaSourceURL || !mediaPlayerID) {
            this.plugin.menus.alert("No media source URL or media player ID was found for this button")
            return
        }

        // Update object
        await this.plugin.hooks.trigger('plugins.media-playback.properties.set', {
            objectID: mediaPlayerID,
            changes: {

                // Set media source
                ['component:media-playback:media-source:src']: mediaSourceURL,
                ['component:media-playback:media-source:event-name']: this.getField('event-name') || '',

                // Sync command: Play immediately from the beginning
                public: {
                    media_source_sync_action: 'play',
                    media_source_sync_time: Date.now(),
                    media_source_sync_nonce: Date.now(),
                    media_source_sync_seek: 0
                }

            }
        })

    }
}
