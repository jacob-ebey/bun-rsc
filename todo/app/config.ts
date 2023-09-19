export const cookiePath = "/";
export const loginPathname = "/";
export const loginSuccessRedirect = "/todos";

export function href(path: string) {
	return `${cookiePath}/${path}`;
}
