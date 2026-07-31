import { describe, it, expect } from "vitest";
import { isDisplayableImageUrl, canOptimizeImage } from "@/lib/game-images";

const GEEKDO = "https://cf.geekdo-images.com/abc/img/original/pic1.jpg";

describe("isDisplayableImageUrl", () => {
  it("accepteert een https-url van een bekende host", () => {
    expect(isDisplayableImageUrl(GEEKDO)).toBe(true);
  });

  it("accepteert een https-url van een willekeurige host", () => {
    expect(isDisplayableImageUrl("https://example.invalid/doos.jpg")).toBe(true);
  });

  it("weigert http zonder tls", () => {
    expect(isDisplayableImageUrl("http://cf.geekdo-images.com/x.jpg")).toBe(false);
  });

  it("weigert een ander protocol", () => {
    expect(isDisplayableImageUrl("ftp://example.invalid/x.jpg")).toBe(false);
  });

  it("weigert null", () => {
    expect(isDisplayableImageUrl(null)).toBe(false);
  });

  it("weigert een lege string", () => {
    expect(isDisplayableImageUrl("")).toBe(false);
  });

  it("weigert een onzinnige url", () => {
    expect(isDisplayableImageUrl("geen url")).toBe(false);
  });
});

describe("canOptimizeImage", () => {
  it("accepteert cf.geekdo-images.com", () => {
    expect(canOptimizeImage(GEEKDO)).toBe(true);
  });

  it("accepteert images.boardgamegeek.com", () => {
    expect(canOptimizeImage("https://images.boardgamegeek.com/x.jpg")).toBe(true);
  });

  it("weigert een host die niet in next.config.ts staat", () => {
    expect(canOptimizeImage("https://example.invalid/doos.jpg")).toBe(false);
  });

  it("weigert http, ook op een bekende host", () => {
    expect(canOptimizeImage("http://cf.geekdo-images.com/x.jpg")).toBe(false);
  });

  it("weigert een subdomein dat er alleen op lijkt", () => {
    expect(canOptimizeImage("https://cf.geekdo-images.com.evil.invalid/x.jpg")).toBe(false);
  });

  it("weigert null", () => {
    expect(canOptimizeImage(null)).toBe(false);
  });
});
