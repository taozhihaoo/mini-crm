import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext";
import { ApiError } from "../api/client";
import LoginPage from "../pages/LoginPage";

const loginMock = vi.fn();

vi.mock("../api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/users")>();
  return { ...actual, login: (...args: unknown[]) => loginMock(...args) };
});

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("renders email and password fields", () => {
    renderLogin();
    expect(screen.getByTestId("login-email")).toBeInTheDocument();
    expect(screen.getByTestId("login-password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });

  it("submits credentials and navigates on success", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      access_token: "token-123",
      token_type: "bearer",
      user: {
        id: "u1",
        email: "admin@clientflow.dev",
        full_name: "Alex Admin",
        role: "admin",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    renderLogin();

    await user.type(screen.getByTestId("login-email"), "admin@clientflow.dev");
    await user.type(screen.getByTestId("login-password"), "Admin123!");
    await user.click(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("admin@clientflow.dev", "Admin123!");
    });
    await waitFor(() => {
      expect(localStorage.getItem("cf_token")).toBe("token-123");
    });
  });

  it("shows an error message on invalid credentials", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    renderLogin();

    await user.type(screen.getByTestId("login-email"), "admin@clientflow.dev");
    await user.type(screen.getByTestId("login-password"), "wrong");
    await user.click(screen.getByTestId("login-submit"));

    expect(await screen.findByTestId("login-error")).toHaveTextContent("Invalid email or password");
  });
});
