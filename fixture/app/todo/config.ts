export const cookiePath = "/todo";
export const loginPathname = "/todo";
export const loginSuccessRedirect = "/todo";

export function href(path: string) {
	return `${cookiePath}/${path}`;
}
