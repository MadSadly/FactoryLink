/**
 * 구매자 대시보드 본문 — 레이아웃은 PortalLayout 에서 제공
 */
export default function BuyerDashboard() {
  return (
    <>
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-on-surface">내 거래 현황</h2>
              <p className="text-lg text-on-surface-variant">
                산업용 부품 조달의 전체 진행 상황을 실시간으로 확인합니다.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">진행 중 12건</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* 카드 1 */}
            <div className="flex flex-col gap-6 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-surface-container">
                    <img
                      alt="터빈 부품"
                      className="h-full w-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHv_TmQBxP3t93c_7GPIfwuT1M1Q4wIY6XiNDuj3jeXtjpoVm0YUDIlVxPTtldXMUPFYPtpC-YdXnDG50L--wam5P9B3amSGx0ElF_y-977YfuOI5H-AJPvk2UVzunAznl-Xo_TuX60CDAiFYTpwfRvPoxfvCHkrewqvRoXieqY9ROq7NVUA4-RL-cku6Ms83z_OtDcwsZoaaz3q_rzZJHZGbMWiJDHai-YiD_13rNFgNrkTi9lHkoKeOYX4rPNBe7Zss1HCEB8cmB"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">터빈 블레이드 v4</h3>
                    <p className="font-mono text-xs text-slate-500">ID: FL-9902-X</p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
                  견적
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <span>상태: 견적 대기</span>
                  <span>20%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full w-1/5 rounded-full bg-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-surface-variant/30 pt-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">수량</p>
                  <p className="text-sm font-semibold">500개</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">예상 금액</p>
                  <p className="text-sm font-semibold">₩16,500,000</p>
                </div>
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-surface-container py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-high"
              >
                상세 보기
              </button>
            </div>

            {/* 카드 2 */}
            <div className="relative flex flex-col gap-6 overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="absolute right-0 top-0 p-4">
                <div className="flex -space-x-2">
                  <div className="h-6 w-6 overflow-hidden rounded-full border-2 border-white bg-slate-200">
                    <img
                      alt="공급사"
                      className="h-full w-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyJ4h1B2VnUwR0V5n6aqNoKKCXrc0d0vIKXzl7cHwBQdejJhOPCZCcg-rthRh5ZU2XqgwOPRvRnR8Jp1LlCBHNH7HMA72ORv5qFo39W3NdM2TneczneKceuedCLGx9bpuk3QuHL4M--1s5r3c5NSTY2FWkQ2aUx9iLEK2Ht5kJmwZVVzkKwZ3SnwoIiyTPXXJfYnBXbErVNKvzJ-LZcopr1DF5yGja03EZYqDoBW4EHZjeicWrxQJVzHSgtHRnqMdSS9V-a-ZuhHMj"
                    />
                  </div>
                  <div className="h-6 w-6 overflow-hidden rounded-full border-2 border-white bg-slate-200">
                    <img
                      alt="구매자"
                      className="h-full w-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuApBknEp9vkF6tGTOl3mGUMlxFpCMjZAIdxolHPZ8_cJGbfsKVGEgJF2w3XdDvPfPENnZtWccijs6hxWOXtiObDF9Mtnto9A2EpM7MkEOorKi-w9I8TQVB444Z52_Draiv95rvRU7nIwLZnQO4EOg3R2I0lRA9gJbXEKnbNLHRGOvrikPTm0uRnQyLnCkUQxP3cS-XlT5RYMyp6ujqA3Ws-UUN-EB-70BLAnPDJR1SzAKqyrMBuGpMZ2-eE_hVn4F9MIkSPmIojzGRf"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-surface-container">
                    <img
                      alt="정밀 기어"
                      className="h-full w-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB8LbKmd8b-t0d0K9b3e-r2NgJ3LH-GhBJh6_PhXTrWzKtbZJvKZuR45MFQfR9fPkE50NiIJhlIQKCrCSTu56BRg91wdJ3FRkH4jiKfy6Fi8mL6x4zVGyeHaB0cpOd6-F5jNhNgHQwcH3R3cUSswCPiEBLcKXt_HHjdQ3d9rsnbf7EbXIcrX5HhxWTRLNbsClV3aHTZ9N211kdoH1VLlH7ohqWrJm3go-wmtDcb17qIoZziT1b5Uy85yyZsQqi60mUDXqYsnxJora_"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">맞춤 기어 세트</h3>
                    <p className="font-mono text-xs text-slate-500">ID: FL-4410-G</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border-l-4 border-primary bg-surface-container-low p-3">
                <p className="text-xs italic text-on-surface-variant">
                  &quot;금요일 전에 주문하시면 리드타임을 4일 줄일 수 있습니다.&quot;
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">— 공급사 A</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <span>상태: 가격 협상</span>
                  <span>65%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full w-[65%] rounded-full bg-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-surface-variant/30 pt-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">최적 제안</p>
                  <p className="text-sm font-semibold">₩11,900,000</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">납기</p>
                  <p className="text-sm font-semibold">14일</p>
                </div>
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-primary py-2 text-xs font-bold uppercase tracking-widest text-on-primary shadow-lg shadow-primary/10 transition-all hover:opacity-90"
              >
                채팅 열기
              </button>
            </div>

            {/* 카드 3 */}
            <div className="flex flex-col gap-6 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-surface-container">
                    <img
                      alt="회로 기판"
                      className="h-full w-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0AQprY8bfNjf7VpUorJB0aMxZ6o1qS1q4cy1fpj9wP_NJPjcfE1Q46KtTPzukAfH5VgJrIEzupz9BE0hjimX_1knfd_lydbZrP6JiLNJtdyFRoilzj0UOvnir8E0YjgkQOGlAYgknoYJbvHI2R2FXiWiz9IYiyJlbR29-oKVt6LJtPyHdRtW9T9PbBsOkdOxd5dZz0oNmUzVugAbpvMlOBoVPaOzabw39bCQJyiuRKAmIOh93X81Z9ODcTj0FTmzIYVC1gskjkObE"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">IoT 제어 모듈</h3>
                    <p className="font-mono text-xs text-slate-500">ID: FL-2281-Z</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  계약 완료
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <span>상태: 제조 진행</span>
                  <span>92%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full w-[92%] rounded-full bg-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-surface-variant/30 pt-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">주문 합계</p>
                  <p className="text-sm font-semibold">₩60,000,000</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">납기일</p>
                  <p className="text-sm font-semibold">2023년 10월 24일</p>
                </div>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm">file_download</span>
                발주서 보내기
              </button>
            </div>

            {/* AI 인사이트 */}
            <div className="flex flex-col items-center gap-8 rounded-xl bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-xl shadow-primary/20 md:col-span-2 md:flex-row">
              <div className="flex-1 space-y-4">
                <div className="w-fit rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
                  <span className="text-[10px] font-bold uppercase tracking-widest">AI 시장 동향</span>
                </div>
                <h3 className="text-2xl font-bold">다음 달 알루미늄 가격이 약 4.2% 하락할 것으로 예측됩니다.</h3>
                <p className="text-sm text-blue-100 opacity-90">
                  긴급하지 않은 금속 부품 견적은 14일 정도 미루면 비용 효율이 높아질 수 있습니다.
                </p>
                <button
                  type="button"
                  className="rounded-lg bg-white px-6 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-blue-50"
                >
                  전체 리포트 보기
                </button>
              </div>
              <div className="flex h-48 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-lg md:w-1/3">
                <div className="flex h-full w-full flex-col justify-end gap-2 p-4">
                  <div className="flex h-24 items-end gap-1">
                    <div className="h-[40%] w-full rounded-t-sm bg-white/40" />
                    <div className="h-[60%] w-full rounded-t-sm bg-white/40" />
                    <div className="h-[55%] w-full rounded-t-sm bg-white/40" />
                    <div className="h-[80%] w-full rounded-t-sm bg-white/40" />
                    <div className="h-[70%] w-full rounded-t-sm bg-white/40" />
                    <div className="h-[90%] w-full rounded-t-sm bg-white/40" />
                    <div className="h-[45%] w-full rounded-t-sm bg-white" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold opacity-60">
                    <span>9월</span>
                    <span>10월(예상)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div className="flex flex-col gap-6 rounded-xl bg-surface-container p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">최근 활동</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-semibold">견적 수신</p>
                    <p className="text-xs text-on-surface-variant">정밀엔지니어링㈜가 RFQ-882 견적을 보냈습니다.</p>
                    <span className="text-[10px] text-slate-400">2분 전</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-semibold">결제 확인</p>
                    <p className="text-xs text-on-surface-variant">청구서 INV-2023-01 결제가 완료되었습니다.</p>
                    <span className="text-[10px] text-slate-400">4시간 전</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-400" />
                  <div>
                    <p className="text-sm font-semibold">배송 업데이트</p>
                    <p className="text-xs text-on-surface-variant">‘제어 모듈’ 주문이 함부르크항에 도착했습니다.</p>
                    <span className="text-[10px] text-slate-400">어제</span>
                  </div>
                </div>
              </div>
              <button type="button" className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-primary">
                전체 기록 보기
              </button>
            </div>
          </div>
    </>
  );
}
