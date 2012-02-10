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
 * CodeIgniter Benchmark Class
 *
 * This class enables you to mark points and calculate the time difference
 * between them.  Memory consumption can also be displayed.
 *
 * @package		CodeIgniter
 * @subpackage	Libraries
 * @category	Libraries
 * @author		ExpressionEngine Dev Team
 * @link		http://codeigniter.com/user_guide/libraries/benchmark.html
 */
	var CI_Benchmark = new function CI_Benchmark() {

		var $marker = [];
	
		CI_Benchmark.__construct = function() {
			
		}
		
		// --------------------------------------------------------------------
	
		/**
		 * Set a benchmark marker
		 *
		 * Multiple calls to this function can be made so that several
		 * execution points can be timed
		 *
		 * @access	public
		 * @param	string	$name	name of the marker
		 * @return	void
		 */
		CI_Benchmark.mark = function($name) {
			$marker[$name] = PHP.microtime();
		}
	
		// --------------------------------------------------------------------
	
		/**
		 * Calculates the time difference between two marked points.
		 *
		 * If the first parameter is empty this function instead returns the
		 * {elapsed_time} pseudo-variable. This permits the full system
		 * execution time to be shown in a template. The output class will
		 * swap the real value for this variable.
		 *
		 * @access	public
		 * @param	string	a particular marked point
		 * @param	string	a particular marked point
		 * @param	integer	the number of decimal places
		 * @return	mixed
		 */
		CI_Benchmark.elapsed_time = function($point1, $point2, $decimals) {
			if ($point1 == '') {
				return '{elapsed_time}';
			}
	
			if (! $marker[$point1]) {
				return '';
			}
	
			if ( ! $marker[$point2]) {
				$marker[$point2] = PHP.microtime();
			}
		
			$s = PHP.explode(' ', $marker[$point1]);
			$sm = $s[0];
			$ss = $s[1];
	
			$e = PHP.explode(' ', $marker[$point2]);

			$em = $e[0];
			$es = $e[1];
	
			return PHP.number_format(($em + $es) - ($sm + $ss), $decimals);
		}
	 	
		// --------------------------------------------------------------------
	
		/**
		 * Memory Usage
		 *
		 * This function returns the {memory_usage} pseudo-variable.
		 * This permits it to be put it anywhere in a template
		 * without the memory being calculated until the end.
		 * The output class will swap the real value for this variable.
		 *
		 * @access	public
		 * @return	string
		 */
		CI_Benchmark.memory_usage = function() {
			return '{memory_usage}';
		}
	
		return CI_Benchmark;
	}
	
	//CI_Benchmark.prototype.constructor = CI_Benchmark.__construct();
	
	module.exports = CI_Benchmark;
})();

// END CI_Benchmark class

/* End of file Benchmark.php */
/* Location: ./system/libraries/Benchmark.php */