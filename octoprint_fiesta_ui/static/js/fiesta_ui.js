/*
 * View model for OctoPrint-Fiesta-UI
 *
 * Author: Roman Fasakhov
 * License: AGPLv3
 */

Vue.use(VueResource);
// FIXME: Avoid hardcoded apikey
var api_key = '6C74610DCF3949CA84F4570E2A4C183B';
Vue.http.headers.common['X-Api-Key'] = api_key;

var app = new Vue({
    el: '#app',
    data: {
        url: 'http://localhost:5000',
        apikey: api_key,
        printer_status: false,
        current_active: 'start'
    },

    created: function() {

    },

    methods : {
        fetchPrinterStatus: function() {
            console.log('Updating printer status...');
        },

        printerStatus: function () {
            this.printer_status = OctoPrint.connection.getSettings().statusText;
        },

        homeBtn: function () {
            console.log('Home button method');
            this.api_connection_GET();
            this.current_active = 'start'},
        tutorialBtn: function () {console.log('Tutorial button method')},
        settingsBtn: function () {console.log('Settings button method')},
        modelLibraryBtn: function () {
            console.log('Model Library button method');
            this.current_active = 'model_library'
        },
        drawToPrintBtn: function () {
            console.log('Draw-to-print button method');
            this.current_active = 'draw_to_print'},

        // api_connection_GET: function () {
        //     console.log(OctoPrint.settings.get());
        //     console.log(OctoPrint.options);
        // },

        api_connection_GET: function () {
            var self = this;
            var r_url = this.url + '/api/connection';
            this.$http.get(r_url).then(function (response) {
                if (response.status == "200") {
                    console.log(response);
                }
            })
        }
    },
    mounted: function() {
        // Provide options to OctoPrintClient instance
        OctoPrint.options.baseurl = this.url;
        OctoPrint.options.apikey = this.apikey;
        this.timer = setInterval(this.fetchPrinterStatus, 10000);
    }
});

