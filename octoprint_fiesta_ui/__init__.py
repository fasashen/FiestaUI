# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.server

class Fiesta_uiPlugin(octoprint.plugin.StartupPlugin,
					  octoprint.plugin.UiPlugin,
					  octoprint.plugin.TemplatePlugin,
					  octoprint.plugin.AssetPlugin,
					  octoprint.plugin.SettingsPlugin):

	def on_after_startup(self):
		self._logger.info("FiestaUI plugin has been activated!")

	def get_assets(self):
		return dict(
			css=['css/fiesta_ui.css'],
			js=['js/fiesta_ui.js']
		)

	def will_handle_ui(self, request):
		# returns True if the plugin will handle UI
		return request.args.get('fiesta') != '0'

	def on_ui_render(self, now, request, render_kwargs):
		self._logger.debug("on_ui_render request headers:")
		self._logger.debug(request.headers)

		fiesta_ui_url = "plugin/%s"%self._identifier

		api_key = octoprint.server.UI_API_KEY

		from flask import make_response, render_template
		return make_response(render_template("fiesta_ui_index.jinja2",
											 fiesta_ui_url=fiesta_ui_url,
											 **render_kwargs))


__plugin_name__ = "Fiesta_ui Plugin"
__plugin_implementation__ = Fiesta_uiPlugin()
