import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class SystemErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("HANZI.OS render failure", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="fatal-system-state">
        <ShieldAlert size={44} />
        <span className="system-kicker">RECOVERY PROTOCOL</span>
        <h1>Luồng hiển thị đã gián đoạn</h1>
        <p>Tiến độ đã lưu vẫn còn nguyên. Tải lại giao diện để nối lại phiên học.</p>
        <button className="primary-button" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={18} /> Tái kết nối
        </button>
      </main>
    );
  }
}
