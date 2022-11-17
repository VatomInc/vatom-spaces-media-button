/**
 * This is the main entry point for your plugin.
 *
 * All information regarding plugin development can be found at
 * https://developer.vatom.com/plugins/plugins/
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

        this.objects.registerComponent(MediaButton, {
            id: 'media-button',
            name: 'Media Button',
            description: 'Converts this object into a media plugin',
            settings: obj => [
                { id: 'info', type: 'label', value: 'Settings' },
                { id: 'select-name', name: 'Select Via Name', type: 'checkbox', help: 'Allows for selection of media player via its name rather than ID.'},
                this.getComponentField(obj, 'media-button', 'select-name') == true ? {id: 'media-player-name', name: 'Media Player Name', type: 'select-item', help: 'Name of the media player object. Leaving this blank will default button to nearest media player (within 20 metres).'} :
                { id: 'media-player-id', name: 'Media Player ID', type: 'input', help: 'ID of the media player object.Leaving this blank will default button to nearest media player (within 20 metres).'},
                { id: 'media-source-id', name: 'Media Source URL', type: 'input', help:'URL for the media source you wish to play with this button.'},
                { id: 'who-can-click', name: 'Who Can Press?', type: 'select', default: 'Everyone', values: ['Everyone', 'Admin Only'], help: 'Type of user who is allowed to click on the media button. Default is Everyone.' },
            ]
        })

    }

}

class MediaButton extends BaseComponent{
    
    async onClick() {

        // Stop if set to admin only and user is not admin
        let isAdmin = await this.plugin.user.isAdmin()
        if(this.getField('who-can-click') == "Admin Only" && !isAdmin){
            return
        }
        
        // Get media button settings
        let usingName = this.getField('select-name')
        let mediaPlayerID = usingName ?  this.getField('media-player-name') : this.getField('media-player-id')
        let mediaSourceID = this.getField('media-source-id')


        // If no player ID specified attempt to find nearest one
        if(!mediaPlayerID){
            let button = await this.plugin.objects.get(this.objectID)
            let nearbyObjects = await this.plugin.objects.fetchInRadius(button.x, button.y, 15)
            let foundDistance = 0
            let mediaPlayer = null
            for(let object of nearbyObjects){
                let position = {x: object.x || 0, y: object.y || 0}
                let distance = Math.sqrt((position.x - button.x) ** 2 + (position.y - button.y) ** 2)
                let isMediaPlayer = false
                if(object.components){
                    for(let component of object.components){
                        if(component.id == "media-playback:media-source"){
                            isMediaPlayer = true
                        }
                    }
                    if((!mediaPlayer || foundDistance > distance) && isMediaPlayer) {
                        mediaPlayer = object
                        foundDistance = distance
                    }
                }
               
            }

            if(mediaPlayer) mediaPlayerID = mediaPlayer.id
        }

        // If both settings are present
        if(mediaSourceID && mediaPlayerID) {
            await this.plugin.hooks.trigger('media.presenter.setObjectProperties', { 
                objectID: mediaPlayerID,
                changes: {
    
                    // Set media source
                    ['component:media-playback:media-source:src']: mediaSourceID,
    
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
        else{
            this.plugin.menus.alert("No media source URL or media player ID was found for this button")
        }

    }
}
