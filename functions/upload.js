import { errorHandling, telemetryData } from "./utils/middleware.js";
import { authenticateUploadJson } from "./utils/auth.js";
import { jsonResponse } from "./utils/http.js";
import { createDefaultMetadata, putMetadata } from "./utils/metadata.js";
import { allocateShortId, isShortUrlsEnabled, putShortLink } from "./utils/shortlink.js";
import { getUploadProvider } from "./storage/index.js";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const authResponse = authenticateUploadJson(request, env);
        if (authResponse) {
            return authResponse;
        }

        const provider = getUploadProvider(env);
        provider.validateConfig(env);

        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            throw new Error('No file uploaded');
        }

        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        const longId = await provider.upload(env, uploadFile, { fileName, fileExtension });
        let shortId = null;

    // 将文件信息保存到 KV 存储
    if (env.img_url) {
      try {
        if (isShortUrlsEnabled(env)) {
          shortId = await allocateShortId(env);
        }

        await putMetadata(env, longId, createDefaultMetadata(longId, {
          fileName,
          fileSize: uploadFile.size,
          provider: provider.key,
          ...(shortId ? { shortId } : {}),
        }));

        if (shortId) {
          await putShortLink(env, shortId, longId);
        }
      } catch (kvError) {
        console.error('KV metadata write failed (quota exceeded?):', kvError);
        throw new Error(
          '文件已上传到存储，但 KV 元数据写入失败：很可能是免费版 KV 每日写入额度（1000 次/天，UTC 0 点即北京时间 08:00 重置）已耗尽。' +
          '请升级 KV 套餐，或等待额度重置后重试。文件本身可能已存入存储但未被记录，可稍后在后台查看。'
        );
      }
    }

        return jsonResponse([{ 'src': `/file/${shortId || longId}` }]);
    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse({ error: error.message }, { status: 500 });
    }
}
