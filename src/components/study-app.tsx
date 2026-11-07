"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Settings,
  Sprout,
  X,
} from "lucide-react";
import type { Bootstrap, PublicPack, RunView } from "@/lib/types";
import { api } from "./api-client";
import Admin from "./admin";
import Quiz from "./quiz";
import { PackDetail, Plans, Reviews, Stats } from "./learning-views";
type View =
  "home" | "packs" | "review" | "goals" | "stats" | "settings" | "admin";
const nav = [
  { id: "home", label: "오늘의 학습", icon: LayoutDashboard },
  { id: "packs", label: "나의 학습팩", icon: Library },
  { id: "review", label: "오답과 복습", icon: RotateCcw },
  { id: "goals", label: "학습 계획", icon: CalendarDays },
  { id: "stats", label: "학습 현황", icon: ChartNoAxesCombined },
] as const;
function PackCard({ pack, open }: { pack: PublicPack; open: () => void }) {
  return (
    <button className="pack-card" onClick={open}>
      <div className="pack-art">
        <BookOpen size={38} strokeWidth={1} />
        <span>STUDY PACK / {String(pack.version).padStart(2, "0")}</span>
        <div className="book-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="pack-body">
        <span className="eyebrow">
          {pack.concepts.length}개념 · {pack.questionCount}문항
        </span>
        <h3>{pack.title}</h3>
        <p>{pack.description}</p>
        <div className="pack-progress">
          <progress
            max={pack.concepts.length}
            value={pack.studied.length}
            aria-label={`${pack.title} 개념 학습 진도`}
          />
          <span>
            {Math.round((pack.studied.length / pack.concepts.length) * 100)}%
          </span>
        </div>
        <div className="card-footer">
          <span>학습 이어가기</span>
          <ArrowRight size={18} />
        </div>
      </div>
    </button>
  );
}
export default function StudyApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [run, setRun] = useState<RunView | null>(null);
  const [savedRun, setSavedRun] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], select",
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [menu]);
  const refresh = useCallback(async () => {
    const next = await api<Bootstrap>("bootstrap");
    setData(next);
    return next;
  }, []);
  useEffect(() => {
    void api<Bootstrap>("bootstrap")
      .then((d) => {
        setData(d);
        if (d.user) {
          setView(d.user.role === "admin" ? "admin" : "home");
          setSavedRun(sessionStorage.getItem(`active-${d.user.id}`));
        }
      })
      .catch((e) => setError(e.message));
  }, [refresh]);
  async function switchUser(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("session", { profileId: id });
      setRun(null);
      setSelected(null);
      setNotice("");
      const next = await refresh();
      setView(next.user?.role === "admin" ? "admin" : "home");
      setSavedRun(sessionStorage.getItem(`active-${id}`));
      setMenu(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(path: string, body: unknown) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, body);
      await refresh();
      setNotice("저장했습니다.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function start(input: unknown) {
    setBusy(true);
    setError("");
    try {
      const next = await api<RunView>("runs", input);
      setRun(next);
      setSavedRun(next.id);
      sessionStorage.setItem(`active-${data!.user!.id}`, next.id);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: View) {
    setView(next);
    setSelected(null);
    setRun(null);
    setMenu(false);
    setNotice("");
    setError("");
    window.scrollTo({ top: 0 });
  }
  function open(id: string) {
    setSelected(id);
    setView("packs");
    setRun(null);
    setNotice("");
    window.scrollTo({ top: 0 });
  }
  async function finish() {
    await refresh();
    if (data?.user) sessionStorage.removeItem(`active-${data.user.id}`);
    setSavedRun(null);
  }
  if (!data)
    return (
      <main className="loading">
        <Sprout size={36} />
        <h1>AstraAI</h1>
        <p>{error || "학습실을 준비하고 있어요…"}</p>
        {error && (
          <button
            className="button primary"
            onClick={() => void refresh().catch((e) => setError(e.message))}
          >
            다시 시도
          </button>
        )}
      </main>
    );
  if (!data.user)
    return (
      <main className="login">
        <div className="login-story">
          <div className="brand">
            <span className="brand-mark">
              <Sprout size={23} />
            </span>
            AstraAI
          </div>
          <p className="eyebrow">작은 공부, 차곡차곡</p>
          <h1>
            배운 것을,
            <br />
            나의 것으로.
          </h1>
          <p className="lead">
            개념을 읽고, 문제를 풀고, 다시 복습하는
            <br />
            나만의 조용한 학습실.
          </p>
          <div className="login-notes">
            <span>01 개념 이해</span>
            <span>02 문제 풀이</span>
            <span>03 반복 학습</span>
          </div>
          <div className="paper-art" aria-hidden="true">
            <BookOpen size={100} strokeWidth={0.7} />
            <span>오늘의 한 페이지</span>
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="login-form">
          <span className="tag">로컬 개발 데모</span>
          <h2>학습실 입장</h2>
          <p>데모 계정을 선택해 흐름을 체험하세요.</p>
          <div className="notice">
            개발/데모 전용 계정 전환입니다.
            <br />
            실제 로그인이나 초대 인증이 아닙니다.
          </div>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          {data.profiles.map((p) => (
            <button
              className="profile-option"
              disabled={busy}
              key={p.id}
              onClick={() => void switchUser(p.id)}
            >
              <span className="avatar">
                {p.role === "admin" ? "관" : p.name.slice(-1)}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.role === "admin"
                    ? "프롬프트 · 문제은행 · 게시 관리"
                    : "개념 · 퀴즈 · 나의 학습 기록"}
                </small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
          <p className="muted login-footnote">
            모든 학습 내용과 기록은 이 개발 환경에 저장됩니다.
          </p>
        </div>
      </main>
    );
  const user = data.user;
  const isAdmin = user.role === "admin";
  const pack = data.packs.find((p) => p.id === selected);
  const s = data.summary;
  const date = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date());
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Sprout size={22} />
          </span>
          AstraAI
          <button
            className="icon-button mobile-only"
            aria-label="메뉴 닫기"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <p className="sidebar-caption">나를 위한 학습 공간</p>
        <nav aria-label="주 메뉴">
          {isAdmin ? (
            <button
              className={view === "admin" ? "active" : ""}
              onClick={() => navigate("admin")}
            >
              <Plus size={19} />
              학습팩 관리
            </button>
          ) : (
            nav.map((n) => (
              <button
                key={n.id}
                className={view === n.id ? "active" : ""}
                aria-current={view === n.id ? "page" : undefined}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={19} />
                {n.label}
                {n.id === "review" && s.due > 0 && (
                  <span className="nav-count">{s.due}</span>
                )}
              </button>
            ))
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-note">
            <Sprout size={22} />
            <p>
              완벽한 하루보다
              <br />
              <strong>꾸준한 한 페이지.</strong>
            </p>
          </div>
          <button
            className={`nav-settings ${view === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            설정 및 도움말
          </button>
          <div className="profile-bar">
            <span className="avatar">
              {isAdmin ? "관" : user.name.slice(-1)}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>데모 계정</small>
            </div>
            <button
              className="icon-button"
              aria-label="로그아웃"
              onClick={() => void act("logout", {})}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="메뉴 닫기"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace" inert={menu}>
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-only"
              aria-label="메뉴 열기"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              나의 학습실
              <ChevronRight size={14} />
              <strong>
                {isAdmin
                  ? "관리자"
                  : nav.find((n) => n.id === view)?.label || "설정"}
              </strong>
            </span>
          </div>
          <span className="demo-badge">
            <span />
            로컬 데모
          </span>
        </header>
        <div className="demo-strip">
          <span>개발/데모 전용 계정 전환</span>
          <label className="sr-only" htmlFor="profile-select">
            데모 계정
          </label>
          <select
            id="profile-select"
            value={user.id}
            disabled={busy}
            onChange={(e) => void switchUser(e.target.value)}
          >
            {data.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <main id="main" className="main-content" aria-busy={busy}>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              {notice}
            </div>
          )}
          {run ? (
            <Quiz
              key={run.id}
              initial={run}
              finish={finish}
              close={() => {
                setRun(null);
                void refresh();
              }}
            />
          ) : isAdmin && view !== "settings" ? (
            <Admin
              packs={data.adminPacks}
              refresh={async () => {
                await refresh();
              }}
            />
          ) : view === "settings" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">학습실 이용 안내</p>
                  <h1>설정 및 도움말</h1>
                </div>
                <CircleHelp />
              </div>
              <section className="panel">
                <h2>이 환경의 저장과 계정</h2>
                <p>
                  개발용 데모 사용자 3명과 관리자 1명을 전환할 수 있습니다. 데모
                  계정은 실제 신원을 확인하지 않습니다. 공개 서비스용 인증은
                  아직 연결하지 않았습니다.
                </p>
                <p>
                  학습팩과 기록은 서버의 로컬 파일에 저장됩니다. 새로고침·서버
                  재시작 후 유지되지만, 파일이나 개발 환경을 지우면 복구되지
                  않습니다.
                </p>
                <p>
                  앱은 ChatGPT에 자료를 전송하거나 AI API를 호출하지 않습니다.
                  학습 지표와 복습 일정은 기록에 따른 규칙으로 계산합니다.
                </p>
              </section>
              {!isAdmin && (
                <section className="panel">
                  <h2>내 데모 학습 기록 삭제</h2>
                  <p>
                    현재 계정의 풀이·복습·계획·개념 학습 기록을 삭제합니다.
                    학습팩과 다른 계정의 기록은 유지됩니다.
                  </p>
                  <label>
                    확인 문구 ‘내 기록 삭제’ 입력
                    <input
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                  <button
                    className="button danger"
                    disabled={confirmation !== "내 기록 삭제" || busy}
                    onClick={() =>
                      void act("reset", {
                        confirmation: "DELETE_MY_DEMO_RECORDS",
                      }).then((ok) => {
                        if (!ok) return;
                        setConfirmation("");
                        sessionStorage.removeItem(`active-${user.id}`);
                        setSavedRun(null);
                      })
                    }
                  >
                    내 데모 기록 삭제
                  </button>
                </section>
              )}
            </>
          ) : pack ? (
            <PackDetail
              key={pack.revisionId}
              pack={pack}
              start={start}
              act={act}
              back={() => setSelected(null)}
            />
          ) : view === "review" ? (
            <Reviews data={data} start={start} act={act} />
          ) : view === "goals" ? (
            <Plans data={data} act={act} open={open} />
          ) : view === "stats" ? (
            <Stats data={data} resume={setRun} />
          ) : (
            <>
              {view === "home" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">{date}</p>
                      <h1>오늘의 학습</h1>
                      <p>{user.name}님, 오늘도 나만의 속도로 쌓아가세요.</p>
                    </div>
                    <span className="heading-icon">
                      <Sprout size={30} />
                    </span>
                  </div>
                  <section className="today-banner">
                    <div>
                      <span className="tag">나의 공부 루틴</span>
                      <h2>
                        한 개념을 이해하고,
                        <br />한 걸음 더 나아가요.
                      </h2>
                      <p>
                        {data.packs.length
                          ? `${data.packs.length}개 학습팩에서 오늘의 공부를 시작해 보세요.`
                          : "관리자가 학습팩을 게시하면 이곳에서 시작할 수 있어요."}
                      </p>
                      <button
                        className="button primary"
                        disabled={!data.packs.length}
                        onClick={() => data.packs[0] && open(data.packs[0].id)}
                      >
                        학습 시작하기
                        <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="routine-art" aria-hidden="true">
                      <span>오늘의 학습 노트</span>
                      <div>
                        <Check size={16} />
                        개념을 이해하기
                      </div>
                      <div>
                        <span className="empty-check" />
                        문제로 확인하기
                      </div>
                      <div>
                        <span className="empty-check" />한 번 더 돌아보기
                      </div>
                      <Sprout
                        className="art-sprout"
                        size={64}
                        strokeWidth={1}
                      />
                    </div>
                  </section>
                  <div className="stats-grid">
                    <div className="stat">
                      <span>
                        <BookOpen size={17} />
                        누적 풀이
                      </span>
                      <strong>
                        {s.answered}
                        <small>문항</small>
                      </strong>
                      <p>한 문제씩 쌓인 기록</p>
                    </div>
                    <div className="stat">
                      <span>
                        <Check size={17} />
                        나의 정답률
                      </span>
                      <strong>
                        {s.answered
                          ? Math.round((s.correct / s.answered) * 100)
                          : "—"}
                        <small>%</small>
                      </strong>
                      <p>
                        {s.answered
                          ? `${s.answered}문항 중 ${s.correct}개 정답`
                          : "첫 퀴즈 후 확인하세요"}
                      </p>
                    </div>
                    <button
                      className="stat stat-link"
                      onClick={() => navigate("review")}
                    >
                      <span>
                        <RotateCcw size={17} />
                        오늘 복습
                      </span>
                      <strong>
                        {s.due}
                        <small>개</small>
                      </strong>
                      <p>
                        기억을 단단하게 만드는 시간
                        <ArrowRight size={16} />
                      </p>
                    </button>
                  </div>
                  {savedRun && (
                    <div className="notice resume">
                      <span>아직 제출하지 않은 학습이 있어요.</span>
                      <button
                        className="button secondary"
                        onClick={() =>
                          void api<RunView>(`runs/${savedRun}`)
                            .then(setRun)
                            .catch((e) => {
                              setError(e.message);
                              setSavedRun(null);
                              sessionStorage.removeItem(`active-${user.id}`);
                            })
                        }
                      >
                        진행 중 학습 이어가기
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">함께 나누는 학습 자료</p>
                    <h1>나의 학습팩</h1>
                    <p>개념부터 퀴즈, 플래시카드와 모의고사까지.</p>
                  </div>
                  <span className="tag">{data.packs.length}개 학습팩</span>
                </div>
              )}
              <div className="section-heading">
                <h2>{view === "home" ? "이어서 학습하기" : "게시된 학습팩"}</h2>
                {view === "home" && (
                  <button
                    className="text-button"
                    onClick={() => navigate("packs")}
                  >
                    전체 학습팩
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
              {data.packs.length ? (
                <div className="pack-grid">
                  {data.packs.map((p) => (
                    <PackCard key={p.id} pack={p} open={() => open(p.id)} />
                  ))}
                </div>
              ) : (
                <div className="empty panel">
                  <Library size={36} />
                  <h2>아직 게시된 학습팩이 없어요</h2>
                  <p>
                    관리자 계정에서 JSON을 검수하고 게시해 주세요.
                    <br />
                    게시된 자료만 학습자에게 나타납니다.
                  </p>
                </div>
              )}
              {view === "home" && (
                <section className="study-tip">
                  <div className="icon-tile">
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h3>공부할 시간을 미리 정해 두세요.</h3>
                    <p>
                      하루 공부 시간과 시험 목표를 설정하고 꾸준히 이어가세요.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("goals")}
                  >
                    계획 세우기
                    <ArrowRight size={16} />
                  </button>
                </section>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>AstraAI · 나의 학습실</span>
            <span>AI 생성 연습문제 · 정답과 출처는 관리자 검수 필요</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
