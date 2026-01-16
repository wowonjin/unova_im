"use client";

import { useState } from "react";
import Link from "next/link";
import AdminTextbooksListView from "./AdminTextbooksListView";
import AdminTextbooksRegisterView from "./AdminTextbooksRegisterView";

type TextbookRow = {
  id: string;
  position?: number;
  title: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string | Date;
  isPublished: boolean;
  isSoldOut?: boolean;
  thumbnailUrl: string | null;
  entitlementDays?: number | null;
  teacherName?: string | null;
  subjectName?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  salesCount?: number;
};

type TextbookOption = { id: string; title: string; originalName: string };

type Tab = "list" | "register";

export default function AdminTextbooksClient({
  saleItems,
  textbookOptions,
}: {
  saleItems: TextbookRow[];
  textbookOptions: TextbookOption[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("list");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-transparent">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between py-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">판매 물품</h1>
            </div>
            <Link
              href="/admin/textbooks/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-all hover:bg-white/90"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              교재 업로드
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("list")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "list"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              판매 목록
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                {saleItems.length}
              </span>
              {activeTab === "list" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "register"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              새 물품 등록
              {activeTab === "register" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {activeTab === "list" ? (
          <AdminTextbooksListView items={saleItems} />
        ) : (
          <AdminTextbooksRegisterView textbooks={textbookOptions} onComplete={() => setActiveTab("list")} />
        )}
      </div>
    </div>
  );
}
