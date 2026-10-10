const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { buildSync } = require("esbuild");
const { QueryClient, QueryObserver } = require("@tanstack/react-query");

const root = path.resolve(__dirname, "..");
const normalized = (value) => JSON.parse(JSON.stringify(value));
function storage() {
    const entries = new Map();
    return {
        getItem: (key) => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, String(value)),
        removeItem: (key) => entries.delete(key),
    };
}
function load(relative, globals = {}, replace = []) {
    const filename = path.join(root, relative);
    let source = fs.readFileSync(filename, "utf8");
    for (const [before, after] of replace) source = source.replace(before, after);
    const compiled = buildSync({
        stdin: { contents: source, resolveDir: path.dirname(filename), sourcefile: filename },
        bundle: true, format: "cjs", platform: "node", write: false,
        define: { "import.meta.env.VITE_API_URL": '"http://example.invalid"' },
    }).outputFiles[0].text;
    const module = { exports: {} };
    const context = vm.createContext({
        module, exports: module.exports, require, Blob, File, DOMException, AbortController,
        console, setTimeout, clearTimeout, Date, ...globals,
    });
    vm.runInContext(compiled, context);
    return { api: module.exports, context };
}
function jpeg(width = 12000, height = 9000, orientation = 1, sof = 0xC0) {
    const bytes = [0xFF, 0xD8];
    if (orientation !== 1) {
        const exif = [69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0];
        bytes.push(0xFF, 0xE1, 0, exif.length + 2, ...exif);
    }
    bytes.push(0xFF, sof, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0, 0xFF, 0xDA);
    return new File([Uint8Array.from(bytes)], "camera.jpg", { type: "image/jpeg" });
}
function device(overrides = {}) {
    const sessionStorage = overrides.sessionStorage || storage();
    const queryClient = overrides.queryClient || { removeQueries() {} };
    const counters = { decode: [], close: 0, draws: 0, createdUrls: [], revokedUrls: [] };
    const canvases = [];
    const globals = {
        sessionStorage, queryClient,
        navigator: { deviceMemory: 4, hardwareConcurrency: 8 },
        window: {},
        Image: class { constructor() { throw new Error("Full resolution Image fallback is forbidden"); } },
        URL: {
            createObjectURL(file) {
                const url = "blob:preview-" + counters.createdUrls.length;
                counters.createdUrls.push({ url, file });
                return url;
            },
            revokeObjectURL(url) { counters.revokedUrls.push(url); },
        },
        document: {
            createElement(type) {
                assert.equal(type, "canvas");
                const canvas = {
                    width: 0, height: 0,
                    getContext() { return { drawImage() { counters.draws++; } }; },
                    toBlob(callback, mime, quality) {
                        canvas.quality = quality;
                        callback(new Blob(["compressed"], { type: mime }));
                    },
                };
                canvases.push(canvas);
                return canvas;
            },
        },
        createImageBitmap: async (file, options) => {
            counters.decode.push(options);
            return { width: options.resizeWidth, height: options.resizeHeight, close() { counters.close++; } };
        },
        ...overrides,
    };
    const { api, context } = load("src/features/checkinout/utils/deviceUtils.js", globals, [
        ['import { queryClient } from "../../../shared/lib/queryClient";', "const queryClient = globalThis.queryClient;"],
    ]);
    return { api, context, counters, canvases, sessionStorage };
}

test("108MP JPEG with tiny compressed size still requests a 768x576 bitmap", async () => {
    const env = device();
    const result = await env.api.compressImage(jpeg());
    assert.ok(jpeg().size < 60 * 1024);
    assert.deepEqual(normalized(env.counters.decode[0]), {
        resizeWidth: 768, resizeHeight: 576, resizeQuality: "low", imageOrientation: "from-image",
    });
    assert.equal(result.type, "image/jpeg");
    assert.equal(result.optimizedInfo.width, 768);
    assert.equal(env.counters.close, 1);
    assert.equal(env.canvases[0].quality, 0.60);
    assert.equal(env.canvases[0].width, 0);
    assert.equal(env.canvases[0].height, 0);
});
test("header reads are bounded to 64KiB and cover all SOF variants", async () => {
    const env = device();
    for (const marker of [0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF]) {
        const file = jpeg(12000, 9000, 1, marker);
        const measured = await env.api.getHeaderDimensions({
            slice(start, end) { assert.equal(start, 0); assert.equal(end, 65536); return file.slice(start, end); },
        });
        assert.deepEqual(normalized(measured), { width: 12000, height: 9000 });
    }
});
test("EXIF portrait rotation preserves aspect ratio", async () => {
    const env = device();
    const result = await env.api.compressImage(jpeg(12000, 9000, 6));
    assert.equal(result.optimizedInfo.width, 576);
    assert.equal(result.optimizedInfo.height, 768);
});
test("PNG and WebP dimensions are obtained without pixels", async () => {
    const env = device();
    const png = Buffer.alloc(33);
    Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
    png.writeUInt32BE(13, 8); png.write("IHDR", 12);
    png.writeUInt32BE(6000, 16); png.writeUInt32BE(4000, 20);
    assert.deepEqual(normalized(await env.api.getHeaderDimensions(new Blob([png]))), { width: 6000, height: 4000 });
    const webp = Buffer.alloc(30);
    webp.write("RIFF", 0); webp.write("WEBP", 8); webp.write("VP8X", 12);
    webp.writeUIntLE(5999, 24, 3); webp.writeUIntLE(3999, 27, 3);
    assert.deepEqual(normalized(await env.api.getHeaderDimensions(new Blob([webp]))), { width: 6000, height: 4000 });
});
test("low memory profile caps dimensions at 640 and numeric quality remains compatible", async () => {
    const env = device({ navigator: { deviceMemory: 2, hardwareConcurrency: 4 } });
    const result = await env.api.compressImage(jpeg(), 0.35);
    assert.equal(result.optimizedInfo.width, 640);
    assert.equal(result.optimizedInfo.profile, "LITE");
    assert.equal(env.canvases[0].quality, 0.35);
});
test("unknown or truncated headers reject without any pixel decoder", async () => {
    const env = device();
    for (const bytes of [[], [0xFF,0xD8,0xFF,0xE1,0,0], [0xFF,0xD8,0xFF,0xC0,0,255], [1,2,3,4]]) {
        await assert.rejects(env.api.compressImage(new File([Uint8Array.from(bytes)], "bad.jpg")), /leer esta foto/);
    }
    assert.equal(env.counters.decode.length, 0);
    assert.equal(env.canvases.length, 0);
});
test("missing or failing native decoder never falls back to Image", async () => {
    const missing = device({ createImageBitmap: undefined });
    await assert.rejects(missing.api.compressImage(jpeg()), /Actualiza/);
    const failed = device({ createImageBitmap: async () => { throw new Error("decoder failed"); } });
    await assert.rejects(failed.api.compressImage(jpeg()), /decoder failed/);
    assert.equal(failed.canvases.length, 0);
});
test("ignored resize options close the original bitmap before canvas allocation", async () => {
    let closed = 0;
    const env = device({ createImageBitmap: async () => ({ width: 12000, height: 9000, close() { closed++; } }) });
    await assert.rejects(env.api.compressImage(jpeg()), /no redujo/);
    assert.equal(closed, 1);
    assert.equal(env.canvases.length, 0);
});
for (const failure of ["context", "draw", "encode-null", "encode-throw"]) {
    test("resource cleanup and pending-marker cleanup on " + failure, async () => {
        const env = device();
        env.sessionStorage.setItem("gl_camera_pending", Date.now());
        env.context.document.createElement = () => {
            const canvas = {
                width: 0, height: 0,
                getContext() {
                    if (failure === "context") return null;
                    return { drawImage() { if (failure === "draw") throw new Error("draw failed"); } };
                },
                toBlob(callback) {
                    if (failure === "encode-throw") throw new Error("encode failed");
                    callback(null);
                },
            };
            env.canvases.push(canvas);
            return canvas;
        };
        await assert.rejects(env.api.compressImage(jpeg()));
        assert.equal(env.counters.close, 1);
        assert.equal(env.canvases[0].width, 0);
        assert.equal(env.canvases[0].height, 0);
        assert.equal(env.sessionStorage.getItem("gl_camera_pending"), null);
    });
}
test("abort during native decode closes the late bitmap without allocating canvas", async () => {
    let finish;
    let closed = 0;
    const env = device({ createImageBitmap: () => new Promise((resolve) => { finish = resolve; }) });
    const controller = new AbortController();
    const processing = env.api.compressImage(jpeg(), { signal: controller.signal });
    while (!finish) await new Promise(setImmediate);
    controller.abort();
    finish({ width: 768, height: 576, close() { closed++; } });
    await assert.rejects(processing, { name: "AbortError" });
    assert.equal(closed, 1);
    assert.equal(env.canvases.length, 0);
});
test("camera purge revokes only owned previews and retains observed query data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["active"], { client: "kept" });
    queryClient.setQueryData(["inactive"], { rows: [1,2,3] });
    const observer = new QueryObserver(queryClient, { queryKey: ["active"], staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => {});
    assert.equal(queryClient.getQueryCache().find({ queryKey: ["active"] }).isActive(), true);
    const env = device({ queryClient });
    const url = env.api.createImagePreviewUrl(new Blob(["preview"]));
    env.api.purgeMemoryBeforeCamera();
    assert.deepEqual(env.counters.revokedUrls, [url]);
    assert.equal(queryClient.getQueryData(["active"]).client, "kept");
    assert.equal(queryClient.getQueryData(["inactive"]), undefined);
    assert.ok(Number(env.sessionStorage.getItem("gl_camera_pending")) > 0);
    env.api.revokeImagePreviewUrl(url);
    assert.equal(env.counters.revokedUrls.length, 1);
    unsubscribe(); queryClient.clear();
});
test("draft survives a fresh module load and contains no photo pixels", () => {
    const sessionStorage = storage();
    const first = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage }).api;
    const draft = {
        owner: "seller-1", selectedClient: { type: "SAP", sapCode: "CL123", firstName: "Tienda" },
        initialClientData: { fullName: "Tienda" }, inputValue: "CL123", visitType: "IN", comment: "",
    };
    assert.equal(first.saveCheckinDraft(draft), true);
    const second = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage }).api;
    const restored = normalized(second.readCheckinDraft("seller-1"));
    delete restored.timestamp;
    assert.deepEqual(restored, draft);
    assert.equal(restored.image, undefined);
});
test("expired, corrupt and foreign-owner drafts are removed", () => {
    const sessionStorage = storage();
    const api = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage }).api;
    for (const raw of [
        "{bad json",
        JSON.stringify({ owner: "seller-1", timestamp: Date.now() - 30 * 60 * 1000 }),
        JSON.stringify({ owner: "seller-2", timestamp: Date.now() }),
        JSON.stringify({ owner: "seller-1", timestamp: Date.now() + 10000 }),
        JSON.stringify({ owner: "seller-1", timestamp: Date.now(), selectedClient: [] }),
    ]) {
        sessionStorage.setItem("gl_checkin_draft", raw);
        assert.equal(api.readCheckinDraft("seller-1"), null);
        assert.equal(sessionStorage.getItem("gl_checkin_draft"), null);
    }
});
test("blocked storage does not break draft, camera purge or compression", async () => {
    const blocked = {
        getItem() { throw new Error("blocked"); },
        setItem() { throw new Error("blocked"); },
        removeItem() { throw new Error("blocked"); },
    };
    const api = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage: blocked }).api;
    assert.equal(api.readCheckinDraft("seller-1"), null);
    assert.equal(api.saveCheckinDraft({ owner: "seller-1", inputValue: "CL1" }), false);
    api.clearCheckinDraft();
    const env = device({ sessionStorage: blocked });
    env.api.purgeMemoryBeforeCamera();
    await env.api.compressImage(jpeg());
});
test("recovery is consumed once, labels uncertainty and ignores expired pending camera", () => {
    const sessionStorage = storage();
    const api = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage }).api;
    sessionStorage.setItem("gl_camera_pending", Date.now());
    const recovery = api.consumeCameraRecovery(false);
    assert.equal(recovery.pendingCamera, true);
    assert.equal(recovery.oomConfirmed, false);
    assert.equal(recovery.detection, "pending_camera_on_reload");
    assert.equal(api.consumeCameraRecovery(false), null);
    assert.equal(api.consumeCameraRecovery(true).wasDiscarded, true);
    assert.equal(api.consumeCameraRecovery(true), null);
    sessionStorage.setItem("gl_camera_pending", Date.now() - 31 * 60 * 1000);
    assert.equal(api.consumeCameraRecovery(false), null);
});
test("successful submission cleanup removes draft, legacy client and camera marker", () => {
    const sessionStorage = storage();
    const api = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage }).api;
    for (const key of ["gl_checkin_draft", "checkin_selected_client", "gl_camera_pending"]) sessionStorage.setItem(key, "value");
    api.clearCheckinDraft();
    for (const key of ["gl_checkin_draft", "checkin_selected_client", "gl_camera_pending"]) assert.equal(sessionStorage.getItem(key), null);
});
test("GPS coordinates survive reload only within the five-minute freshness limit", () => {
    const sessionStorage = storage();
    sessionStorage.setItem("gl_checkin_location", JSON.stringify({
        location: { latitude: -12.05, longitude: -77.04, accuracy: 15 }, timestamp: Date.now(),
    }));
    assert.equal(device({ sessionStorage }).api.getCachedLocation().latitude, -12.05);
    sessionStorage.setItem("gl_checkin_location", JSON.stringify({
        location: { latitude: -12.05, longitude: -77.04 }, timestamp: Date.now() - 6 * 60 * 1000,
    }));
    assert.equal(device({ sessionStorage }).api.getCachedLocation(), null);
});
test("telemetry uses the authenticated route without refresh/logout interceptors", async () => {
    const calls = [];
    const axios = { post: async (...args) => { calls.push(args); } };
    const api = load("src/features/checkinout/services/telemetryService.js", {
        axios, navigator: { userAgent: "test-browser", deviceMemory: 2, hardwareConcurrency: 4 },
    }, [['import axios from "axios";', "const axios = globalThis.axios;"]]).api;
    await api.sendDeviceTelemetry("APP_KILLED_BY_OS_OOM", { pendingCamera: true, oomConfirmed: false });
    assert.equal(calls[0][0], "/reportModule/visit-logs/telemetry");
    assert.equal(calls[0][1].metrics.deviceMemoryGB, 2);
    assert.equal(calls[0][2].withCredentials, true);
    axios.post = async () => { throw new Error("offline"); };
    await api.sendDeviceTelemetry("CAMERA_LAUNCH");
});
// Harness de hooks: controla montajes y promesas sin necesitar un navegador ni cámara nativa.
function uploadHarness(compressImage) {
    const cells = [];
    let cursor = 0;
    let effects = [];
    let api;
    const notices = [];
    const created = [];
    const revoked = [];
    const toast = (notice) => notices.push(notice);
    const hooks = {
        useState(initial) {
            const index = cursor++;
            if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
            return [cells[index], (value) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }];
        },
        useRef(initial) {
            const index = cursor++;
            if (!(index in cells)) cells[index] = { current: initial };
            return cells[index];
        },
        useCallback(callback, dependencies) {
            const index = cursor++;
            const prior = cells[index];
            if (!prior || dependencies.some((value, i) => value !== prior.dependencies[i])) cells[index] = { callback, dependencies };
            return cells[index].callback;
        },
        useEffect(callback, dependencies) {
            const index = cursor++;
            const prior = cells[index];
            if (!prior || dependencies.some((value, i) => value !== prior.dependencies[i])) {
                effects.push(() => {
                    prior?.cleanup?.();
                    cells[index] = { dependencies, cleanup: callback() };
                });
            }
        },
    };
    const deps = {
        compressImage,
        createImagePreviewUrl(file) { const url = "blob:" + created.length; created.push({ url, file }); return url; },
        revokeImagePreviewUrl(url) { if (url) revoked.push(url); },
        clearCameraPending() {},
    };
    const loaded = load("src/features/checkinout/hooks/useImageUpload.js", { hooks, deps, toast }, [
        ['import { useState, useCallback, useEffect, useRef } from "react";', "const { useState, useCallback, useEffect, useRef } = globalThis.hooks;"],
        ['import { useToast } from "@chakra-ui/react";', "const useToast = () => globalThis.toast;"],
        ['import { compressImage, createImagePreviewUrl, revokeImagePreviewUrl, clearCameraPending } from "../utils/deviceUtils";',
            "const { compressImage, createImagePreviewUrl, revokeImagePreviewUrl, clearCameraPending } = globalThis.deps;"],
        ['import { sendDeviceTelemetry } from "../services/telemetryService";', "const sendDeviceTelemetry = async () => {};"],
    ]);
    function render() {
        cursor = 0;
        api = loaded.api.useImageUpload();
        const pending = effects; effects = [];
        for (const effect of pending) effect();
        return api;
    }
    function unmount() { for (const cell of cells) cell?.cleanup?.(); }
    return { render, unmount, created, revoked, notices, get api() { return api; } };
}
test("reset during decode blocks overlapping photos and discards the late result", async () => {
    let resolve;
    let calls = 0;
    let signal;
    const harness = uploadHarness((file, options) => {
        calls++; signal = options.signal;
        return new Promise((finish) => { resolve = finish; });
    });
    harness.render();
    const pending = harness.api.setDirectImage(jpeg());
    harness.render();
    assert.equal(harness.api.isProcessingImage, true);
    harness.api.resetImage();
    harness.render();
    assert.equal(signal.aborted, true);
    await harness.api.setDirectImage(jpeg());
    assert.equal(calls, 1);
    resolve(new File(["optimized"], "small.jpg"));
    await pending;
    harness.render();
    assert.equal(harness.api.image, null);
    assert.equal(harness.api.isProcessingImage, false);
    assert.equal(harness.created.length, 0);
    harness.unmount();
});
test("unmount during decode does not create a late preview or show a late error", async () => {
    let resolve;
    let signal;
    const harness = uploadHarness((file, options) => {
        signal = options.signal;
        return new Promise((finish) => { resolve = finish; });
    });
    harness.render();
    const pending = harness.api.setDirectImage(jpeg());
    harness.unmount();
    assert.equal(signal.aborted, true);
    resolve(new File(["optimized"], "small.jpg"));
    await pending;
    assert.equal(harness.created.length, 0);
    assert.equal(harness.notices.length, 0);
});
test("preview replacement, camera cancel, reset and unmount release each owned URL once", async () => {
    const optimized = new File(["optimized"], "small.jpg");
    const harness = uploadHarness(async () => optimized);
    harness.render();
    await harness.api.setDirectImage(jpeg()); harness.render();
    await harness.api.setDirectImage(jpeg()); harness.render();
    assert.deepEqual(harness.revoked, ["blob:0"]);
    harness.api.prepareForCamera(); harness.render();
    assert.equal(harness.api.imagePreview, null);
    harness.api.handleCameraCancel(); harness.render();
    assert.equal(harness.api.imagePreview, "blob:2");
    harness.api.resetImage(); harness.render();
    harness.unmount();
    assert.deepEqual(harness.revoked, ["blob:0", "blob:1", "blob:2"]);
});
test("EXIF orientation is retained when a later APP1 segment contains XMP", async () => {
    const env = device();
    const original = Buffer.from(await jpeg(12000, 9000, 6).arrayBuffer());
    const exifEnd = 2 + 2 + original.readUInt16BE(4);
    const xmp = Buffer.from([0xFF,0xE1,0,8,88,77,80,0,0,0]);
    const combined = new File([original.subarray(0, exifEnd), xmp, original.subarray(exifEnd)], "camera.jpg");
    const dimensions = normalized(await env.api.getHeaderDimensions(combined));
    assert.deepEqual(dimensions, { width: 9000, height: 12000 });
});
test("vendor ownership remains stable when numeric login codes reload as strings", () => {
    const api = load("src/features/checkinout/utils/checkinSession.js", { sessionStorage: storage() }).api;
    assert.equal(api.getCheckinDraftOwner("seller-1", 26), api.getCheckinDraftOwner("seller-1", "26"));
    assert.notEqual(api.getCheckinDraftOwner("seller-1", 26), api.getCheckinDraftOwner("seller-2", 26));
});