/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import Link from "next/link";
import { EAuthModes } from "@plane/constants";

interface TermsAndConditionsProps {
  authType?: EAuthModes;
}

// Constants for better maintainability
const LEGAL_LINKS = {
  termsOfService: "https://ghn.vn",
  privacyPolicy: "https://ghn.vn",
} as const;

// Reusable link component to reduce duplication
const LegalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <Link href={href} className="text-accent-primary" target="_blank" rel="noopener noreferrer">
    <span className="text-13 font-medium hover:underline">{children}</span>
  </Link>
);

export function TermsAndConditions({ authType = EAuthModes.SIGN_IN }: TermsAndConditionsProps) {
  return (
    <div className="flex items-center justify-center">
      <p className="text-center text-13 text-tertiary whitespace-pre-line">
        Bằng cách {authType === EAuthModes.SIGN_UP ? "tạo tài khoản" : "đăng nhập"}, bạn đồng ý với{" "}
        <LegalLink href={LEGAL_LINKS.termsOfService}>Quy định</LegalLink> và{" "}
        <LegalLink href={LEGAL_LINKS.privacyPolicy}>Chính sách bảo mật dữ liệu</LegalLink> của GHN.
      </p>
    </div>
  );
}
