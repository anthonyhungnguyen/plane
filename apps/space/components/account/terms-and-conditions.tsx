/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

type Props = {
  isSignUp?: boolean;
};

export function TermsAndConditions(props: Props) {
  const { isSignUp = false } = props;
  return (
    <span className="flex items-center justify-center py-6">
      <p className="text-center text-13 whitespace-pre-line text-secondary">
        {isSignUp ? "Bằng cách tạo tài khoản" : "Bằng cách đăng nhập"}, bạn đồng ý với{" \n"}
        <a href="https://ghn.vn" target="_blank" rel="noopener noreferrer">
          <span className="text-13 font-medium underline hover:cursor-pointer">Quy định</span>
        </a>{" "}
        và{" "}
        <a href="https://ghn.vn" target="_blank" rel="noopener noreferrer">
          <span className="text-13 font-medium underline hover:cursor-pointer">Chính sách bảo mật dữ liệu</span>
        </a>
        {" của GHN."}
      </p>
    </span>
  );
}
