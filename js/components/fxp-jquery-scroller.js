/*
 * This file is part of the Fxp package.
 *
 * (c) François Pluchino <francois.pluchino@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import AppPjax from '../app-pjax';
import '@fxp/jquery-scroller/js/scroller';

/**
 * Add the App Pjax Component Register and Unregister.
 */
AppPjax.addDefaultRegisters('scroller', '[data-scroller="true"]');
