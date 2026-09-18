"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export default function QRCodeImage({ value }: { value: string }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: { dark: "#0a0810", light: "#ffffff" },
    }).then((data) => active && setSource(data));
    return () => {
      active = false;
    };
  }, [value]);

  if (!source) return <div className="qr-placeholder" aria-label="Preparing QR code" />;

  // QR codes must not be optimized or blurred by the image pipeline.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="qr-image" src={source} alt="QR code for your portrait link" />;
}
