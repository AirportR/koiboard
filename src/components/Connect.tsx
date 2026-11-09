import { useState } from "react";
import { Icon } from "./icons";
import { Button, Notice, Pill, Switch } from "./ui";
import type { KoipyModel } from "../hooks/useKoipyConfig";

export function ConnectPanel({ model, compact = false }: { model: KoipyModel; compact?: boolean }) {
  const [apiBase, setApiBase] = useState(model.apiBase);
  const [password, setPassword] = useState(model.password);
  const [remember, setRemember] = useState(model.rememberPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const connect = () => {
    setError("");
    try {
      const normalized = model.setApiBase(apiBase);
      model.setPassword(password);
      model.setRememberPassword(remember);
      void model.loadConfig({ settings: { apiBase: normalized, password: password.trim() } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div className="stack">
      <div className="field">
        <label className="field__label" htmlFor="connect-api">
          API 地址
          <span className="pill pill--dashed" style={{ marginLeft: "auto" }}>
            留空 = 同源
          </span>
        </label>
        <div className="secret-wrap">
          <input
            id="connect-api"
            className="input input--mono"
            value={apiBase}
            placeholder="http://127.0.0.1:8899"
            onChange={(event) => setApiBase(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") connect();
            }}
            spellCheck={false}
          />
        </div>
        <span className="field__hint">
          本地开发建议<b>留空</b>：Vite 已把 <code className="code-inline">/api</code> 代理到 <code className="code-inline">127.0.0.1:8899</code>，可绕开 CORS。跨域直连时必须把当前来源加入 <code className="code-inline">webapi.allowOrigins</code>。
        </span>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="connect-pass">
          访问密码
        </label>
        <div className="secret-wrap">
          <input
            id="connect-pass"
            className="input input--mono"
            type={showPassword ? "text" : "password"}
            value={password}
            placeholder="webapi.password"
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") connect();
            }}
            autoComplete="current-password"
          />
          <button type="button" className="secret-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>
            <Icon name={showPassword ? "EyeOff" : "Eye"} size={15} />
          </button>
        </div>
        <span className="field__hint">对应 Koipy 配置中的 webapi.password；仅保存在当前浏览器。</span>
      </div>

      <div className="field field--switch">
        <div className="field__text">
          <b>记住密码</b>
          <span>写入 localStorage，关闭后立即清除</span>
        </div>
        <Switch checked={remember} onChange={setRemember} label="记住密码" />
      </div>

      {error ? (
        <Notice tone="amber" icon="TriangleAlert">
          {error}
        </Notice>
      ) : null}

      <div className="inline-actions">
        <Button variant="primary" icon="Zap" onClick={connect} busy={model.busy === "loading"}>
          {model.config ? "重新同步" : "连接并读取配置"}
        </Button>
        {model.demo ? (
          <Button variant="ghost" icon="Eraser" onClick={model.disableDemo}>
            退出演示
          </Button>
        ) : (
          <Button variant="ghost" icon="Sparkles" onClick={model.enableDemo}>
            先看演示
          </Button>
        )}
        {!compact ? (
          <span style={{ marginLeft: "auto" }}>
            <Pill tone={model.health === "online" ? "mint" : model.health === "error" ? "coral" : undefined} icon="Radio">
              {model.health === "online" ? "已连接" : model.health === "error" ? "未连接" : "待连接"}
            </Pill>
          </span>
        ) : null}
      </div>
    </div>
  );
}
