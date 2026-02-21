import { basename } from "node:path";

export interface StorageProvider {
	name: string;
	upload(localPath: string, remotePath: string): Promise<string>; // returns public URL
}

export class YaDiskStorageProvider implements StorageProvider {
	name = "yadisk";

	async upload(localPath: string, remotePath: string): Promise<string> {
		const pkg = "@vforsh/yadisk";
		const { YaDiskClient, getCredentials } = await import(/* @vite-ignore */ pkg);
		const credentials = getCredentials();
		const client = new YaDiskClient(credentials);

		const parentDir = remotePath.replace(/\/[^/]+$/, "");
		if (parentDir) {
			await client.mkdir(parentDir).catch(() => {}); // already exists is fine
		}

		await client.upload(remotePath, localPath);
		const url = await client.publish(remotePath);
		if (!url) {
			const existing = await client.getPublicUrl(remotePath);
			if (!existing) throw new Error(`Failed to get public URL for ${remotePath}`);
			return existing;
		}
		return url;
	}
}

const PROVIDERS: Record<string, () => StorageProvider> = {
	yadisk: () => new YaDiskStorageProvider(),
};

export const KNOWN_PROVIDERS = Object.keys(PROVIDERS);

export function getStorageProvider(name: string): StorageProvider {
	const factory = PROVIDERS[name];
	if (!factory) {
		throw new Error(`Unknown storage provider: ${name}. Known: ${KNOWN_PROVIDERS.join(", ")}`);
	}
	return factory();
}

export function buildRemotePath(uploadDir: string, localPath: string, filenameOverride?: string): string {
	const now = new Date();
	const ts = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
		"-",
		String(now.getHours()).padStart(2, "0"),
		String(now.getMinutes()).padStart(2, "0"),
		String(now.getSeconds()).padStart(2, "0"),
	].join("");
	const filename = filenameOverride || basename(localPath);
	return `${uploadDir.replace(/\/+$/, "")}/${ts}-${filename}`;
}
