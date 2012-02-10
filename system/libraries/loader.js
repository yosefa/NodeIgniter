(function() {
	/**
	 * CodeIgniter
	 *
	 * An open source application development framework for PHP 4.3.2 or newer
	 *
	 * @package		CodeIgniter
	 * @author		ExpressionEngine Dev Team
	 * @copyright	Copyright (c) 2008 - 2010, EllisLab, Inc.
	 * @license		http://codeigniter.com/user_guide/license.html
	 * @link		http://codeigniter.com
	 * @since		Version 1.0
	 * @filesource
	 */
	
	// ------------------------------------------------------------------------
	
	/**
	 * Loader Class
	 *
	 * Loads views and files
	 *
	 * @package		CodeIgniter
	 * @subpackage	Libraries
	 * @author		ExpressionEngine Dev Team
	 * @category	Loader
	 * @link		http://codeigniter.com/user_guide/libraries/loader.html
	 */
	var CI_Loader = new function CI_Loader() {
	
		// All these are set automatically. Don't mess with them.
		var $_ci_ob_level;
		var $_ci_view_path		= '';
		var $_ci_is_php5		= false;
		var $_ci_is_instance 	= false; // Whether we should use $this or $CI =& get_instance()
		var $_ci_cached_vars	= [];
		var $_ci_classes		= [];
		var $_ci_loaded_files	= [];
		var $_ci_models			= [];
		var $_ci_helpers		= [];
		var $_ci_plugins		= [];
		var $_ci_varmap			= {'unit_test': 'unit', 'user_agent': 'agent'};
		
		/**
		 * Constructor
		 *
		 * Sets the path to the view files and gets the initial output buffering level
		 *
		 * @access	public
		 */
		CI_Loader.__construct = function() {	
			$_ci_is_php5 = (Math.floor(PHP.phpversion()) >= 5) ? true : false;
			$_ci_view_path = PHP.constant('APPPATH') + 'views/';
			$_ci_ob_level  = PHP.ob_get_level();
					
			CI_Common.log_message('debug', "Loader Class Initialized");
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Class Loader
		 *
		 * This function lets users load and instantiate classes.
		 * It is designed to be called from a user's app controllers.
		 *
		 * @access	public
		 * @param	string	the name of the class
		 * @param	mixed	the optional parameters
		 * @param	string	an optional object name
		 * @return	void
		 */	
		CI_Loader.library = function($library, $params, $object_name) {
			if ($library == '') {
				return false;
			}
	
			if (!PHP.is_null($params) && !PHP.is_array($params)) {
				$params = null;
			}
	
			if (PHP.is_array($library)) {
				for($class in $library) {
					this._ci_load_class($library[$class], $params, $object_name);
				}
			} else {
				this._ci_load_class($library, $params, $object_name);
			}
			
			this._ci_assign_to_models();
		}
	
		// --------------------------------------------------------------------
		
		/**
		 * Model Loader
		 *
		 * This function lets users load and instantiate models.
		 *
		 * @access	public
		 * @param	string	the name of the class
		 * @param	string	name for the model
		 * @param	bool	database connection
		 * @return	void
		 */	
		CI_Loader.model = function($model, $name, $db_conn) {		
			if (PHP.is_array($model)) {
				for($babe in $model) {
					this.model($babe);	
				}
				
				return;
			}
	
			if ($model == '') {
				return;
			}
		
			// Is the model in a sub-folder? If so, parse out the filename and path.
			if (PHP.strpos($model, '/') == false) {
				$path = '';
			} else {
				$x = PHP.explode('/', $model);
				$model = PHP.end($x);			
				PHP.unset($x[PHP.count($x)-1]);
				$path = PHP.implode('/', $x) + '/';
			}
		
			if ($name == '') {
				$name = $model;
			}
			
			if (PHP.in_array($name, $_ci_models, true)) {
				return;
			}
			
			if (PHP.isset(CI.$name)) {
				CI_Common.show_error('The model name you are loading is the name of a resource that is already being used: ' + $name);
			}
		
			$model = PHP.strtolower($model);
			
			if (!PHP.file_exists(PHP.constant('APPPATH') + 'models/' + $path + $model + PHP.constants('EXT')))
			{
				CI_Common.show_error('Unable to locate the model you have specified: ' + $model);
			}
					
			if ($db_conn !== false && !this.class_exists('CI_DB')) {
				if ($db_conn === true) {
					$db_conn = '';
				}
				
				CI.load.database($db_conn, false, true);
			}
		
			if (!this.class_exists('Model')) {
				CI_Common.load_class('Model', false);
				CI_Model.__construct();
			}
	
			var $c = require(PHP.constant('APPPATH') + 'models/' + $path + $model + PHP.constant('EXT'));
	
			$model = PHP.ucfirst($model);
					
			CI[$name] = $c;
			CI[$name]._assign_libraries();
			
			$_ci_models.push($name);	
		}
			
		// --------------------------------------------------------------------
		
		/**
		 * Database Loader
		 *
		 * @access	public
		 * @param	string	the DB credentials
		 * @param	bool	whether to return the DB object
		 * @param	bool	whether to enable active record (this allows us to override the config setting)
		 * @return	object
		 */	
		CI_Loader.database = function($params, $return, $active_record) {
			// Grab the super object

			// Do we even need to load the database class?
			if (this.class_exists('CI_DB') && $return == false && $active_record == false && PHP.isset($CI.db) && PHP.is_object($CI.db)) {
				return false;
			}	
		
			require(PHP.constant.BASEPATH + 'database/DB' + PHP.constant.EXT);
	
			if ($return === true) {
				return DB($params, $active_record);
			}
			
			// Initialize the db variable.  Needed to prevent   
			// reference errors with some configurations
			CI.db = '';
			
			// Load the DB class
			CI.db = DB($params, $active_record);	
			
			// Assign the DB object to any existing models
			this._ci_assign_to_models();
		}
		
		// --------------------------------------------------------------------
	
		/**
		 * Load the Utilities Class
		 *
		 * @access	public
		 * @return	string		
		 */		
		CI_Loader.dbutil = function() {
			if (!this.class_exists('CI_DB')) {
				this.database();
			}
			
			// for backwards compatibility, load dbforge so we can extend dbutils off it
			// this use is deprecated and strongly discouraged
			CI.load.dbforge();
		
			require(PHP.constant('BASEPATH') + 'database/DB_utility' + PHP.constant('EXT'));
			
			require(PHP.constant('BASEPATH') + 'database/drivers/' + CI.db.dbdriver + '/' + CI.db.dbdriver + '_utility' + PHP.constant.EXT);
			
			$class = 'CI_DB_' + CI.db.dbdriver + '_utility';
	
			CI.dbutil = this.instantiate_class(new $class());
	
			CI.load.$_ci_assign_to_models();
		}
		
		// --------------------------------------------------------------------
	
		/**
		 * Load the Database Forge Class
		 *
		 * @access	public
		 * @return	string		
		 */		
		CI_Loader.dbforge = function() {
			if (!this.class_exists('CI_DB')) {
				this.database();
			}
			
			require(PHP.constant.BASEPATH + 'database/DB_forge' + PHP.constant.EXT);
			
			require(PHP.constant.BASEPATH + 'database/drivers/' + CI.db.dbdriver + '/' + CI.db.dbdriver + '_forge' + PHP.constant.EXT);
			$class = 'CI_DB_' + $CI.db.dbdriver + '_forge';
	
			CI.dbforge = new $class();
			
			CI.load.$_ci_assign_to_models();
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Load View
		 *
		 * This function is used to load a "view" file.  It has three parameters:
		 *
		 * 1. The name of the "view" file to be included.
		 * 2. An associative array of data to be extracted for use in the view.
		 * 3. TRUE/FALSE - whether to return the data or load it.  In
		 * some cases it's advantageous to be able to return data so that
		 * a developer can process it in some way.
		 *
		 * @access	public
		 * @param	string
		 * @param	array
		 * @param	bool
		 * @return	void
		 */
		CI_Loader.view = function($view, $vars, $return) {
			return this.$_ci_load({'_ci_view': $view, '_ci_vars': this.$_ci_object_to_array($vars), '_ci_return': $return});
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Load File
		 *
		 * This is a generic file loader
		 *
		 * @access	public
		 * @param	string
		 * @param	bool
		 * @return	string
		 */
		CI_Loader.file = function($path, $return) {
			return this.$_ci_load({'_ci_path': $path, '_ci_return': $return});
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Set Variables
		 *
		 * Once variables are set they become available within
		 * the controller class and its "view" files.
		 *
		 * @access	public
		 * @param	array
		 * @return	void
		 */
		CI_Loader.vars = function($vars, $val) {
			if($val != '' && PHP.is_string($vars)) {
				$vars = {$vars: $val};
			}
		
			$vars = this.$_ci_object_to_array($vars);
		
			if (PHP.is_array($vars) && PHP.count($vars) > 0) {
				for($key in $vars) {
					this.$_ci_cached_vars[$key] = $vars[$key];
				}
			}
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Load Helper
		 *
		 * This function loads the specified helper file.
		 *
		 * @access	public
		 * @param	mixed
		 * @return	void
		 */
		
		CI_Loader.helper = function($helpers) {
			if (!PHP.is_array($helpers)) {
				$helpers = [ ];
			}
		
			for($helper in $helpers) {		
				$helper = PHP.strtolower(PHP.str_replace(PHP.constant('EXT'), '', PHP.str_replace('_helper', '', $helper)) + '_helper');
	
				if ($_ci_helpers[$helper]) {
					continue;
				}
				
				$ext_helper = PHP.constant('APPPATH') + 'helpers/' + CI_Common.config_item('subclass_prefix') + $helper + PHP.constant.EXT;
	
				// Is this a helper extension request?			
				if (PHP.file_exists($ext_helper)) {
					$base_helper = PHP.constant('BASEPATH') + 'helpers/' + $helper + PHP.constant('EXT');
					
					if (!PHP.file_exists($base_helper)) {
						CI_Common.show_error('Unable to load the requested file: helpers/' + $helper + PHP.constant('EXT'));
					}
					
					require($ext_helper);
					require($base_helper);
				} else if (PHP.file_exists(PHP.constant('APPPATH') + 'helpers/' + $helper + PHP.constant('EXT'))) { 
					require(PHP.constant('APPPATH') + 'helpers/' + $helper + PHP.constant.EXT);
				} else {		
					if(PHP.file_exists(PHP.constant.BASEPATH + 'helpers/' + $helper + PHP.constant('EXT'))) {
						require(PHP.constant('BASEPATH') + 'helpers/' + $helper + PHP.constant('EXT'));
					} else {
						CI_Common.show_error('Unable to load the requested file: helpers/' + $helper + PHP.constant('EXT'));
					}
				}
	
				this.$_ci_helpers[$helper] = true;
				CI_Common.log_message('debug', 'Helper loaded: ' + $helper);	
			}		
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Load Helpers
		 *
		 * This is simply an alias to the above function in case the
		 * user has written the plural form of this function.
		 *
		 * @access	public
		 * @param	array
		 * @return	void
		 */
		CI_Loader.helpers = function($helpers) {
			this.helper($helpers);
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Load Plugin
		 *
		 * This function loads the specified plugin.
		 *
		 * @access	public
		 * @param	array
		 * @return	void
		 */
		CI_Loader.plugin = function($plugins) {
			if (!PHP.is_array($plugins)) {
				$plugins = [ ];
			}
		
			for($plugin in $plugins) {	
				$plugin = PHP.strtolower(PHP.str_replace(PHP.constant('EXT'), '', PHP.str_replace('_pi', '', $plugin)) + '_pi');		
	
				if ($_ci_plugins[$plugin]) {
					continue;
				}
	
				if (PHP.file_exists(PHP.constant('APPPATH') + 'plugins/' + $plugin + PHP.constant('EXT'))) {
					require(PHP.constant('APPPATH') + 'plugins/' + $plugin + PHP.constant('EXT'));	
				} else {
					if (PHP.file_exists(PHP.constant('BASEPATH') + 'plugins/' + $plugin + PHP.constant('EXT'))) {
						require(PHP.constant('BASEPATH') + 'plugins/' + $plugin + PHP.constant('EXT'));	
					} else {
						CI_Common.show_error('Unable to load the requested file: plugins/' + $plugin + PHP.constant('EXT'));
					}
				}
				
				this.$_ci_plugins[$plugin] = true;
				
				CI_Common.log_message('debug', 'Plugin loaded: ' + $plugin);
			}		
		}
	
		// --------------------------------------------------------------------
		
		/**
		 * Load Plugins
		 *
		 * This is simply an alias to the above function in case the
		 * user has written the plural form of this function.
		 *
		 * @access	public
		 * @param	array
		 * @return	void
		 */
		CI_Loader.plugins = function($plugins) {
			this.plugin($plugins);
		}
			
		// --------------------------------------------------------------------
		
		/**
		 * Loads a language file
		 *
		 * @access	public
		 * @param	array
		 * @param	string
		 * @return	void
		 */
		CI_Loader.language = function($file, $lang) {
			if (!PHP.is_array($file)) {
				$file = [ $file ];
			}
	
			for($langfile in $file) {	
				CI.lang.load($langfile, $lang);
			}
		}
	
		/**
		 * Loads language files for scaffolding
		 *
		 * @access	public
		 * @param	string
		 * @return	arra
		 */
		
		CI_Loader.scaffold_language = function($file, $lang, $return) {
			return CI.lang.load($file, $lang, $return);
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Loads a config file
		 *
		 * @access	public
		 * @param	string
		 * @return	void
		 */
		
		CI_Loader.config = function($file, $use_sections, $fail_gracefully) {			
			CI.config.load($file, $use_sections, $fail_gracefully);
		}
	
		// --------------------------------------------------------------------
		
		/**
		 * Scaffolding Loader
		 *
		 * This initializing function works a bit different than the
		 * others. It doesn't load the class.  Instead, it simply
		 * sets a flag indicating that scaffolding is allowed to be
		 * used.  The actual scaffolding function below is
		 * called by the front controller based on whether the
		 * second segment of the URL matches the "secret" scaffolding
		 * word stored in the application/config/routes.php
		 *
		 * @access	public
		 * @param	string
		 * @return	void
		 */	
		CI_Loader.scaffolding = function($table) {		
			if($table === false) {
				CI_Common.show_error('You must include the name of the table you would like to access when you initialize scaffolding');
			}
			
			CI.$_ci_scaffolding = true;
			CI.$_ci_scaff_table = $table;
		}
	
		// --------------------------------------------------------------------
			
		/**
		 * Loader
		 *
		 * This function is used to load views and files.
		 * Variables are prefixed with _ci_ to avoid symbol collision with
		 * variables made available to view files
		 *
		 * @access	private
		 * @param	array
		 * @return	void
		 */
		
		CI_Loader._ci_load = function($_ci_data) {
			// Set the default data variables
			for($_ci_val in ['_ci_view', '_ci_vars', '_ci_path', '_ci_return']) {
				$$_ci_val = (!$_ci_data[$_ci_val]) ? false : $_ci_data[$_ci_val];
			}
	
			// Set the path to the requested file
			if ($_ci_path == '') {
				$_ci_ext = PHP.pathinfo($_ci_view, PHP.flag('PATHINFO_EXTENSION'));
				$_ci_file = ($_ci_ext == '') ? $_ci_view + PHP.constant('EXT') : $_ci_view;
				$_ci_path = $_ci_view_path + $_ci_file;
			} else {
				$_ci_x = PHP.explode('/', $_ci_path);
				$_ci_file = PHP.end($_ci_x);
			}
			
			if (!PHP.file_exists($_ci_path)) {
				CI_Common.show_error('Unable to load the requested file: ' + $_ci_file);
			}
		
			// This allows anything loaded using $this->load (views, files, etc.)
			// to become accessible from within the Controller and Model functions.
			// Only needed when running PHP 5
			
			if (this.$_ci_is_instance()) {
				$_ci_CI = CI;
				
				for($_ci_key in PHP.get_object_vars($_ci_CI)) {
					if (!this[$_ci_key]) {
						this[$_ci_key] = $_ci_CI.$_ci_key;
					}
				}
			}
	
			/*
			 * Extract and cache variables
			 *
			 * You can either set variables using the dedicated $this->load_vars()
			 * function or via the second parameter of this function. We'll merge
			 * the two types and cache them so that views that are embedded within
			 * other views can have access to these variables.
			 */	
			if (PHP.is_array($_ci_vars)) {
				$_ci_cached_vars = PHP.array_merge($_ci_cached_vars, $_ci_vars);
			}
			
			PHP.extract($_ci_cached_vars);
					
			/*
			 * Buffer the output
			 *
			 * We buffer the output for two reasons:
			 * 1. Speed. You get a significant speed boost.
			 * 2. So that the final rendered template can be
			 * post-processed by the output class.  Why do we
			 * need post processing?  For one thing, in order to
			 * show the elapsed page load time.  Unless we
			 * can intercept the content right before it's sent to
			 * the browser and then stop the timer it won't be accurate.
			 */
			PHP.ob_start();
					
			// If the PHP installation does not support short tags we'll
			// do a little string replacement, changing the short tags
			// to standard PHP echo statements.
			
			if (PHP.ini_get('short_open_tag') === false && CI_Common.config_item('rewrite_short_tags') == true) {
				PHP.echo(eval('?>' + PHP.preg_replace("/;*\s*\?>/", "; ?>", PHP.file_get_contents($_ci_path).replace('<?=', '<?php echo '))));
			} else {
				require($_ci_path); // include() vs include_once() allows for multiple views with the same name
			}
			
			CI_Common.log_message('debug', 'File loaded: ' + $_ci_path);
			
			// Return the file data if requested
			if ($_ci_return === true) {		
				$buffer = PHP.ob_get_contents();
				PHP.ob_end_clean();
				return $buffer;
			}
	
			/*
			 * Flush the buffer... or buff the flusher?
			 *
			 * In order to permit views to be nested within
			 * other views, we need to flush the content back out whenever
			 * we are beyond the first level of output buffering so that
			 * it can be seen and included properly by the first included
			 * template and any subsequent ones. Oy!
			 *
			 */	
			
			if (PHP.ob_get_level() > $_ci_ob_level + 1) {
				PHP.ob_end_flush();
			} else {
				// PHP 4 requires that we use a global
				$OUT = PHP.$GLOBALS['OUT'];
				
				$OUT.append_output(PHP.ob_get_contents());
				PHP.ob_end_clean();
			}
		}
	
		// --------------------------------------------------------------------
	
		/**
		 * Load class
		 *
		 * This function loads the requested class.
		 *
		 * @access	private
		 * @param 	string	the item that is being loaded
		 * @param	mixed	any additional parameters
		 * @param	string	an optional object name
		 * @return 	void
		 */
		CI_Loader._ci_load_class = function($class, $params, $object_name) {	
			// Get the class name, and while we're at it trim any slashes.  
			// The directory path can be included as part of the class name, 
			// but we don't want a leading slash

			$class = PHP.str_replace(PHP.constant('EXT'), '', PHP.trim($class, '/'));
		
			// Was the path included with the class name?
			// We look for a slash to determine this
			$subdir = '';
			
			if (PHP.strpos($class, '/') !== false) {
				// explode the path so we can separate the filename from the path
				$x = PHP.explode('/', $class);	
				
				// Reset the $class variable now that we know the actual filename
				$class = PHP.end($x);
				
				// Kill the filename from the array
				PHP.unset($x[PHP.count($x)-1]);
				
				// Glue the path back together, sans filename
				$subdir = PHP.implode($x, '/') + '/';
			}
	
			// We'll test for both lowercase and capitalized versions of the file name
			var $classes = [PHP.ucfirst($class), PHP.strtolower($class)];
			
			for($class in $classes) {
				var $subclass = PHP.constant('APPPATH') + 'libraries/' + $subdir + CI_Common.config_item('subclass_prefix') + $classes[$class] + PHP.constant('EXT');
	
				// Is this a class extension request?			
				if (PHP.file_exists($subclass)) {
					var $baseclass = PHP.constant('BASEPATH') + 'libraries/' + PHP.ucfirst($classes[$class]) + PHP.constant('EXT');
					
					if (!PHP.file_exists($baseclass)) {
						CI_Common.log_message('error', "Unable to load the requested class: " + $classes[$class]);
						CI_Common.show_error("Unable to load the requested class: " + $classes[$class]);
					}
	
					// Safety:  Was the class already loaded by a previous call?
					if (PHP.in_array($subclass, $_ci_loaded_files)) {
						// Before we deem this to be a duplicate request, let's see
						// if a custom object name is being supplied.  If so, we'll
						// return a new instance of the object
						if (!PHP.is_null($object_name)) {
							if (!CI.$object_name) {
								return this._ci_init_class($class, CI_Common.config_item('subclass_prefix'), $params, $object_name);			
							}
						}
						
						$is_duplicate = true;
						
						CI_Common.log_message('debug', $classes[$class] + " class already loaded. Second attempt ignored.");
						return;
					}
		
					require($baseclass);				
					require($subclass);
					$_ci_loaded_files.push($subclass);
		
					return this._ci_init_class($class, CI_Common.config_item('subclass_prefix'), $params, $object_name);			
				}
			
				// Lets search for the requested library file and load it.
				$is_duplicate = false;	
				
				for ($i = 1; $i < 3; $i++) {
					$path = ($i % 2) ? PHP.constant('APPPATH') : PHP.constant('BASEPATH');	
					
					$filepath = $path + 'libraries/' + $subdir + $classes[$class] + PHP.constant('EXT');
					
					// Does the file exist?  No?  Bummer...
					if (!PHP.file_exists($filepath)) {
						continue;
					}
					
					// Safety:  Was the class already loaded by a previous call?
					if (PHP.in_array($filepath, $_ci_loaded_files)) {
						// Before we deem this to be a duplicate request, let's see
						// if a custom object name is being supplied.  If so, we'll
						// return a new instance of the object
						if (!PHP.is_null($object_name)) {
							if (!CI.$object_name) {
								return this._ci_init_class($classes[$class], '', $params, $object_name);
							}
						}
					
						$is_duplicate = true;
						
						CI_Common.log_message('debug', $classes[$class] + " class already loaded. Second attempt ignored.");
						return;
					}
					
					require($filepath);
					$_ci_loaded_files.push($filepath);
					
					return this._ci_init_class($classes[$class], '', $params, $object_name);
				}
			} // END FOREACH
	
			// One last attempt.  Maybe the library is in a subdirectory, but it wasn't specified?
			if ($subdir == '') {
				$path = PHP.strtolower($classes[$class]) + '/' + $classes[$class];
				return this._ci_load_class($path, $params);
			}
			
			// If we got this far we were unable to find the requested class.
			// We do not issue errors if the load call failed due to a duplicate request
			if ($is_duplicate == false) {
				CI_Common.log_message('error', "Unable to load the requested class: " + $classes[$class]);
				CI_Common.show_error("Unable to load the requested class: " + $classes[$class]);
			}
		}
		
		// --------------------------------------------------------------------
	
		/**
		 * Instantiates a class
		 *
		 * @access	private
		 * @param	string
		 * @param	string
		 * @param	string	an optional object name
		 * @return	null
		 */
		CI_Loader._ci_init_class = function($class, $prefix, $config, $object_name) {	
			// Is there an associated config file for this class?
			if ($config === null) {
				// We test for both uppercase and lowercase, for servers that
				// are case-sensitive with regard to file names
				if (PHP.file_exists(PHP.constant('APPPATH') + 'config/' + PHP.strtolower($class) + PHP.constant('EXT'))) {
					var $config = require(PHP.constant('APPPATH') + 'config/' + PHP.strtolower($class) + PHP.constant.EXT);
				} else if (PHP.file_exists(PHP.constant('APPPATH') + 'config/' + PHP.ucfirst(PHP.strtolower($class)) + PHP.constant('EXT'))) {
					var $config = require(PHP.constant('APPPATH') + 'config/' + PHP.ucfirst(PHP.strtolower($class)) + PHP.constant('EXT'));
				}
			}
			
			if ($prefix == '') {			
				if (this['CI_' + $class]) {
					$name = 'CI_' + $class;
				} else if (this[CI_Common.config_item('subclass_prefix') + $class]) {
					$name = CI_Common.config_item('subclass_prefix') + $class;
				} else {
					$name = $class;
				}
			} else {
				$name = $prefix + $class;
			}
			
			// Is the class name valid?
			if (!this[$name]) {
				CI_Common.log_message('error', "Non-existent class: " + $name);
				CI_Common.show_error("Non-existent class: " + $class);
			}
			
			// Set the variable name we will assign the class to
			// Was a custom class name supplied?  If so we'll use it
			$class = PHP.strtolower($class);
			
			if (PHP.is_null($object_name)) {
				$classvar = ( ! $_ci_varmap[$class]) ? $class : $_ci_varmap[$class];
			} else {
				$classvar = $object_name;
			}
	
			// Save the class name and object name		
			$_ci_classes[$class] = $classvar;
	
			// Instantiate the class		
			$CI = CI.get_instance();
			
			if ($config !== null) {
				$CI.$classvar = $class($config);
			} else {		
				$CI.$classvar = $class;
			}	
		} 	
		
		// --------------------------------------------------------------------
		
		/**
		 * Autoloader
		 *
		 * The config/autoload.php file contains an array that permits sub-systems,
		 * libraries, plugins, and helpers to be loaded automatically.
		 *
		 * @access	private
		 * @param	array
		 * @return	void
		 */
		CI_Loader._ci_autoloader = function() {	
			var $autoload = require(PHP.constant('APPPATH') + 'config/autoload' + PHP.constant('EXT'));
			
			if (!$autoload) {
				return false;
			}
			
			$CI = CI.get_instance();

			// Load any custom config file
			if (PHP.count($autoload['config']) > 0) {			
				for($key in $autoload['config']) {
					CI_Config.load($autoload['config'][$key]);
				}
			}		
	
			// Autoload plugins, helpers and languages
			for($type in ['helper', 'plugin', 'language']) {			
				if ($autoload[$type] && PHP.count($autoload[$type]) > 0) {
					this.$type($autoload[$type]);
				}		
			}
	
			// A little tweak to remain backward compatible
			// The $autoload['core'] item was deprecated
			if ( ! $autoload['libraries']) {
				$autoload['libraries'] = $autoload['core'];
			}
			
			// Load libraries
			if ($autoload['libraries'] && PHP.count($autoload['libraries']) > 0) {
				// Load the database driver.
				if (PHP.in_array('database', $autoload['libraries'])) {
					this.database();
					$autoload['libraries'] = PHP.array_diff($autoload['libraries'], ['database']);
				}
	
				// Load scaffolding
				if (PHP.in_array('scaffolding', $autoload['libraries'])) {
					$this.scaffolding();
					$autoload['libraries'] = PHP.array_diff($autoload['libraries'], ['scaffolding']);
				}
			
				// Load all other libraries
				for($item in $autoload['libraries']) {
					this.library($autoload['libraries'][$item]);
				}
			}		
	
			// Autoload models
			if ($autoload['model']) {
				this.model($autoload['model']);
			}
	
		}
		
		// --------------------------------------------------------------------
	
		/**
		 * Assign to Models
		 *
		 * Makes sure that anything loaded by the loader class (libraries, plugins, etc.)
		 * will be available to models, if any exist.
		 *
		 * @access	private
		 * @param	object
		 * @return	array
		 */
		CI_Loader._ci_assign_to_models = function() {
			if (PHP.count($_ci_models) == 0) {
				return;
			}
		
			if (this._ci_is_instance()) {
				for($model in $_ci_models) {			
					CI.$model._assign_libraries();
				}
			} else {		
				for($model in $_ci_models) {			
					this.$model._assign_libraries();
				}
			}
		}  	
	
		// --------------------------------------------------------------------
	
		/**
		 * Object to Array
		 *
		 * Takes an object as input and converts the class variables to array key/vals
		 *
		 * @access	private
		 * @param	object
		 * @return	array
		 */
		CI_Loader._ci_object_to_array = function($object) {
			return (PHP.is_object($object)) ? PHP.get_object_vars($object) : $object;
		}
	
		// --------------------------------------------------------------------
	
		/**
		 * Determines whether we should use the CI instance or $this
		 *
		 * @access	private
		 * @return	bool
		 */
		CI_Loader._ci_is_instance = function() {
			if ($_ci_is_php5 == true) {
				return true;
			}
		
			$CI = PHP.$GLOBALS['CI'];
			
			return (PHP.is_object($CI)) ? true : false;
		}
	
		return CI_Loader;
	}

	//CI_Loader.prototype.constructor = CI_Loader.__construct();
	
	module.exports = CI_Loader;
})();
/* End of file Loader.php */
/* Location: ./system/libraries/Loader.php */