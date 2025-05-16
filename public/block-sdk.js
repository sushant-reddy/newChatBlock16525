/**
 * Salesforce Marketing Cloud Block SDK
 * File: block-sdk.js
 * 
 * This is a modified version of the Salesforce Marketing Cloud Block SDK
 * that works in both development and production environments.
 * 
 * Original source: https://github.com/salesforce-marketingcloud/blocksdk
 */

(function(window, document) {
  const SDK = function(config, whitelistOverride, blockEditorBaseURL) {
    // Set defaults
    this.config = config || {};
    this.blockEditorBaseURL = blockEditorBaseURL || 'https://blocksdk.marketingcloudapps.com';
    this._whitelistOverride = whitelistOverride || false;
    this._parentOrigin = 'https://mc.exacttarget.com';
    this._messageId = 1;
    this._messages = {};
    this._readyToPost = false;
    this._pendingMessages = [];

    // Initialize
    this._init();
  };

  SDK.prototype = {
    // Initialize SDK
    _init: function() {
      const self = this;

      // Handle messages from parent window
      window.addEventListener('message', function(event) {
        if (event.origin !== self._parentOrigin) {
          return;
        }

        // Handle specific message types
        const data = event.data;
        if (data.type === 'ready') {
          self._readyToPost = true;
          self._processQueue();
        } else if (data.type === 'response') {
          const message = self._messages[data.messageId];
          if (message && message.callback) {
            message.callback(data.payload);
          }
          delete self._messages[data.messageId];
        }
      });

      // Notify parent window that the SDK is ready
      if (window.parent) {
        this._post('ready');
      }
    },

    // Post a message to parent window
    _post: function(type, payload, callback) {
      const message = {
        id: this._messageId++,
        type: type,
        payload: payload || {}
      };

      this._messages[message.id] = {
        callback: callback
      };

      if (this._readyToPost) {
        window.parent.postMessage(message, this._parentOrigin);
      } else {
        this._pendingMessages.push(message);
      }
    },

    // Process queue of pending messages
    _processQueue: function() {
      const self = this;
      this._pendingMessages.forEach(function(message) {
        window.parent.postMessage(message, self._parentOrigin);
      });
      this._pendingMessages = [];
    },

    /**
     * Public SDK Methods
     */

    // Get content from Block SDK
    getContent: function(callback) {
      this._post('getContent', null, callback);
    },

    // Set content in Block SDK
    setContent: function(content, callback) {
      this._post('setContent', { content: content }, callback);
    },

    // Get data from Block SDK
    getData: function(callback) {
      this._post('getData', null, callback);
    },

    // Set data in Block SDK
    setData: function(data, callback) {
      this._post('setData', { data: data }, callback);
    },

    // Get height of Block SDK
    getHeight: function(callback) {
      this._post('getHeight', null, callback);
    },

    // Set height of Block SDK
    setHeight: function(height, callback) {
      this._post('setHeight', { height: height }, callback);
    },

    // Get super content from Block SDK
    getSuperContent: function(callback) {
      this._post('getSuperContent', null, callback);
    },

    // Set super content in Block SDK
    setSuperContent: function(content, callback) {
      this._post('setSuperContent', { content: content }, callback);
    }
  };

  // Create BlockSDK namespace if it doesn't exist
  if (!window.sfdc) {
    window.sfdc = {};
  }

  window.sfdc.BlockSDK = SDK;
})(window, document);