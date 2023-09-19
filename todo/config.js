export const cookiePath = "/";
export const loginPathname = "/";
export const loginSuccessRedirect = "/todos";

/**
 *
 * @param {string} path
 * @returns {string}
 */
export function href(path) {
	return `${cookiePath}/${path}`;
}
