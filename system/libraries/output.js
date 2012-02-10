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
 * Output Class
 *
 * Responsible for sending final output to browser
 *
 * @package		CodeIgniter
 * @subpackage	Libraries
 * @category	Output
 * @author		ExpressionEngine Dev Team
 * @link		http://codeigniter.com/user_guide/libraries/output.html
 */
	var CI_Output = new function CI_Output() {

		var $final_output;
		var $cache_expiration	= 0;
		var $headers 			= [];
		var $enable_profiler 	= false;
	
		CI_Output.__construct = function() {
			CI_Common.log_message('debug', "Output Class Initialized");
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Get Output
		 *
		 * Returns the current output string
		 *
		 * @access	public
		 * @return	string
		 */	
		this.get_output = function() {
			return $final_output;
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Set Output
		 *
		 * Sets the output string
		 *
		 * @access	public
		 * @param	string
		 * @return	void
		 */	
		this.set_output = function($output) {
			$final_output = $output;
		}
	
		// --------------------------------------------------------------------
	
		/**
		 * Append Output
		 *
		 * Appends data onto the output string
		 *
		 * @access	public
		 * @param	string
		 * @return	void
		 */	
		this.append_output = function($output) {
			if ($final_output == '') {
				$final_output = $output;
			} else {
				$final_output += $output;
			}
		}
	
		// --------------------------------------------------------------------
	
		/**
		 * Set Header
		 *
		 * Lets you set a server header which will be outputted with the final display.
		 *
		 * Note:  If a file is cached, headers will not be sent.  We need to figure out
		 * how to permit header data to be saved with the cache data...
		 *
		 * @access	public
		 * @param	string
		 * @return	void
		 */	
		this.set_header = function($header, $replace) {
			$headers.push([$header, $replace]);
		}
	
		// --------------------------------------------------------------------
		
		/**
		 * Set HTTP Status Header
		 * moved to Common procedural functions in 1.7.2
		 * 
		 * @access	public
		 * @param	int 	the status code
		 * @param	string	
		 * @return	void
		 */	
		this.set_status_header = function($code, $text) {
			CI_Common.set_status_header($code, $text);
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Enable/disable Profiler
		 *
		 * @access	public
		 * @param	bool
		 * @return	void
		 */	
		this.enable_profiler = function($val) {
			$enable_profiler = (PHP.is_bool($val)) ? $val : true;
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Set Cache
		 *
		 * @access	public
		 * @param	integer
		 * @return	void
		 */	
		this.cache = function($time) {
			$cache_expiration = ( ! PHP.is_numeric($time)) ? 0 : $time;
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Display Output
		 *
		 * All "view" data is automatically put into this variable by the controller class:
		 *
		 * $this->final_output
		 *
		 * This function sends the finalized output data to the browser along
		 * with any server headers and profile data.  It also stops the
		 * benchmark timer so the page rendering speed and memory usage can be shown.
		 *
		 * @access	public
		 * @return	mixed
		 */		
		CI_Output._display = function($output) {	
			// Note:  We use globals because we can't use $CI =& get_instance()
			// since this function is sometimes called by the caching mechanism,
			// which happens before the CI super object is available.

			// --------------------------------------------------------------------
			
			// Set the output data
			if ($output == '') {
				$output = $final_output;
			}
			
			// --------------------------------------------------------------------
			
			// Do we need to write a cache file?
			if ($cache_expiration > 0) {
				this._write_cache($output);
			}
			
			// --------------------------------------------------------------------
	
			// Parse out the elapsed time and memory usage,
			// then swap the pseudo-variables with the data
	
			$elapsed = CI_Benchmark.elapsed_time('total_execution_time_start', 'total_execution_time_end', 3);		
			$output = PHP.str_replace('{elapsed_time}', $elapsed, $output);
			
			$memory	 = ( ! PHP.method_exists(CI_Benchmark, 'memory_get_usage')) ? '0' : Math.round(CI_Benchmark.memory_get_usage()/1024/1024, 2) + 'MB';
			$output = PHP.str_replace('{memory_usage}', $memory, $output);		
	
			// --------------------------------------------------------------------
			
			// Is compression requested?
			if (CI_Config.item('compress_output') == true) {
				if (PHP.extension_loaded('zlib')) {
					if (PHP.isset(PHP.$_SERVER['HTTP_ACCEPT_ENCODING']) || PHP.strpos(PHP.$_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip') != false) {
						PHP.ob_start('ob_gzhandler');
					}
				}
			}
	
			// --------------------------------------------------------------------
			
			// Are there any server headers to send?
			if (PHP.count($headers) > 0) {
				for ($header in $headers) {
					PHP.header($header[0], $header[1]);
				}
			}		
	
			// --------------------------------------------------------------------
			
			// Does the get_instance() function exist?
			// If not we know we are dealing with a cache file so we'll
			// simply echo out the data and exit.
			if ( ! PHP.method_exists(CI, 'get_instance')) {
				PHP.echo($output);
				CI_Common.log_message('debug', "Final output sent to browser");
				CI_Common.log_message('debug', "Total execution time: " + $elapsed);
				return true;
			}
		
			// --------------------------------------------------------------------
	
			// Grab the super object.  We'll need it in a moment...
			$CI = CI.get_instance();
			
			// Do we need to generate profile data?
			// If so, load the Profile class and run it.
			if ($enable_profiler == true) {
				$CI.load.library('profiler');				
											
				// If the output data contains closing </body> and </html> tags
				// we will remove them and add them back after we insert the profile data
				if (PHP.preg_match("|</body>.*?</html>|is", $output)) {
					$output  = PHP.preg_replace("|</body>.*?</html>|is", '', $output);
					$output += $CI.profiler.run();
					$output += '</body></html>';
				} else {
					$output += $CI.profiler.run();
				}
			}
			
			// --------------------------------------------------------------------
	
			// Does the controller contain a function named _output()?
			// If so send the output there.  Otherwise, echo it.
			
			if (PHP.method_exists($CI, '_output')) {
				$CI._output($output);
			} else {
				PHP.echo($output);  // Send it to the browser!
			}
			
			CI_Common.log_message('debug', "Final output sent to browser");
			CI_Common.log_message('debug', "Total execution time: " + $elapsed);		
		}
		
		// --------------------------------------------------------------------
		
		/**
		 * Write a Cache File
		 *
		 * @access	public
		 * @return	void
		 */	
		CI_Output._write_cache = function($output) {
			$CI = CI.get_instance();	
			$path = $CI.config.item('cache_path');
		
			$cache_path = ($path == '') ? PHP.constant('BASEPATH') + 'cache/' : $path;
			
			if ( ! PHP.file_exists($cache_path) || ! CI_Common.is_really_writable($cache_path)) {
				return;
			}
			
			$uri =	$CI.config.item('base_url').
					$CI.config.item('index_page').
					$CI.uri.uri_string();
			
			$cache_path += PHP.md5($uri);
	
			if ( ! $fp = PHP.fopen($cache_path, PHP.constant('FOPEN_WRITE_CREATE_DESTRUCTIVE')))
			{
				CI_Common.log_message('error', "Unable to write cache file: " + $cache_path);
				return;
			}
			
			$expire = PHP.time() + ($cache_expiration * 60);
			
			if (PHP.flock($fp, PHP.flag.LOCK_EX))
			{
				PHP.fwrite($fp, $expire + 'TS--->' + $output);
				PHP.flock($fp, PHP.flag.LOCK_UN);
			}
			else
			{
				CI_Common.log_message('error', "Unable to secure a file lock for file at: ".$cache_path);
				return;
			}
			PHP.fclose($fp);
			PHP.chmod($cache_path, PHP.constant.DIR_WRITE_MODE);
	
			CI_Common.log_message('debug', "Cache file written: " + $cache_path);
		}
	
		// --------------------------------------------------------------------
		
		/**
		 * Update/serve a cached file
		 *
		 * @access	public
		 * @return	void
		 */	
		CI_Output._display_cache = function($CFG, $URI) {
			$cache_path = ($CFG.item('cache_path') == '') ? PHP.constant('BASEPATH') + 'cache/' : $CFG.item('cache_path');
				
			if ( ! PHP.file_exists($cache_path) || ! CI_Common.is_really_writable($cache_path)) {
				return false;
			}
			
			// Build the file path.  The file name is an MD5 hash of the full URI
			$uri =	$CFG.item('base_url') + 
					$CFG.item('index_page') +
					$URI.uri_string;
					
			$filepath = $cache_path + PHP.md5($uri);
			
			if ( ! PHP.file_exists($filepath)) {
				return false;
			}
		
			if ( ! $fp = PHP.fopen($filepath, PHP.constant.FOPEN_READ)) {
				return false;
			}
				
			PHP.flock($fp, PHP.flag.LOCK_SH);
			
			$cache = '';
			
			if (PHP.filesize($filepath) > 0) {
				$cache = PHP.fread($fp, PHP.filesize($filepath));
			}
		
			PHP.flock($fp, PHP.flag.LOCK_UN);
			PHP.fclose($fp);
						
			// Strip out the embedded timestamp		
			if ( ! PHP.preg_match("/(\d+TS--->)/", $cache, $match)) {
				return false;
			}
			
			// Has the file expired? If so we'll delete it.
			if (PHP.time() >= PHP.trim(PHP.str_replace('TS--->', '', $match['1'])))
			{ 		
				PHP.unlink($filepath);
				CI_Common.log_message('debug', "Cache file has expired. File deleted");
				return false;
			}
	
			// Display the cache
			this._display(PHP.str_replace($match['0'], '', $cache));
			CI_Common.log_message('debug', "Cache file is current. Sending it to browser.");		
			return true;
		}
		
		return CI_Output;
	}

	//CI_Output.prototype.constructor = CI_Output.__construct();
	
	module.exports = CI_Output;
})();
// END Output Class

/* End of file Output.php */
/* Location: ./system/libraries/Output.php */