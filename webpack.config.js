const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		'admin/settings': path.resolve(
			process.cwd(),
			'assets/admin/settings',
			'index.ts',
		),
	},
};
