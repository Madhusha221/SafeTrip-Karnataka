import React, { useEffect, useState } from "react";

import {
  ShieldCheck,
  Heart,
  Star,
  Navigation,
  AlertTriangle,
  X,
  User,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Navbar({
  activeTab,
  setActiveTab,
  womenMode,
  setWomenMode,
  onOpenReport,
  onOpenBrief,
  onAdminLogin,
onAdminLogout,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [showForgot, setShowForgot] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  // ============================================================
  // CHECK EXISTING LOGIN
  // ============================================================

  useEffect(() => {
    const savedUser = localStorage.getItem("safetrip_user");

    if (savedUser) {
      try {
        setLoggedInUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("safetrip_user");
      }
    }
  }, []);

  // ============================================================
  // OPEN AUTH MODAL
  // ============================================================

  const openAuthModal = (mode = "signin") => {
    setAuthMode(mode);
    setShowForgot(false);
    setErrorMessage("");
    setSuccessMessage("");
    setShowAuthModal(true);
  };

  // ============================================================
  // CLOSE AUTH MODAL
  // ============================================================

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setShowForgot(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  // ============================================================
  // SIGN UP
  // ============================================================

  const handleSignup = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!signupUsername.trim() || !signupEmail.trim()) {
      setErrorMessage("Please enter your username and email.");
      return;
    }

    if (signupPassword.length < 8) {
      setErrorMessage("Password must contain at least 8 characters.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/register/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: signupUsername.trim(),
            email: signupEmail.trim(),
            first_name: signupFirstName.trim(),
            last_name: signupLastName.trim(),
            password: signupPassword,
            confirm_password: signupConfirmPassword,
          }),
        }
      );

      const data = await response.json();

      console.log("SIGNUP STATUS:", response.status);
      console.log("SIGNUP RESPONSE:", data);

      if (!response.ok) {
        const firstError =
          data?.email?.[0] ||
          data?.username?.[0] ||
          data?.confirm_password?.[0] ||
          data?.password?.[0] ||
          data?.detail ||
          "Unable to create the account.";

        setErrorMessage(firstError);
        return;
      }

      setLoginUsername(signupUsername.trim());

      setSignupUsername("");
      setSignupEmail("");
      setSignupFirstName("");
      setSignupLastName("");
      setSignupPassword("");
      setSignupConfirmPassword("");

      setAuthMode("signin");

      setSuccessMessage(
        "Account created successfully. Please sign in."
      );
    } catch (error) {
      console.error("SIGNUP ERROR:", error);

      setErrorMessage(
        "Unable to connect to the SafeTrip server. Please make sure Django is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SIGN IN
  // ============================================================

  const handleSignin = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const username = loginUsername.trim();

    if (!username || !loginPassword) {
      setErrorMessage(
        "Please enter your username and password."
      );
      return;
    }

    setLoading(true);

    try {
      const loginResponse = await fetch(
        `${API_BASE}/auth/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            password: loginPassword,
          }),
        }
      );

      const loginData = await loginResponse.json();

      console.log(
        "LOGIN STATUS:",
        loginResponse.status
      );

      console.log(
        "LOGIN RESPONSE:",
        loginData
      );

      // --------------------------------------------------------
      // LOGIN FAILED
      // --------------------------------------------------------

      if (!loginResponse.ok) {
        setErrorMessage(
          loginData?.detail ||
            "Invalid username or password."
        );

        return;
      }

      // --------------------------------------------------------
      // SAVE JWT TOKENS
      // --------------------------------------------------------

      localStorage.setItem(
        "safetrip_access_token",
        loginData.access
      );

      localStorage.setItem(
        "safetrip_refresh_token",
        loginData.refresh
      );

      // ========================================================
      // LOGIN SUCCESS
      //
      // IMPORTANT:
      // We use the user returned by the login API directly.
      // We do NOT call /auth/me/ again.
      // ========================================================

      const user = loginData.user;

      if (!user) {
        setErrorMessage(
          "Login succeeded, but user information was not returned."
        );

        return;
      }

      // --------------------------------------------------------
      // SAVE USER
      // --------------------------------------------------------

      localStorage.setItem(
        "safetrip_user",
        JSON.stringify(user)
      );

      setLoggedInUser(user);
if (user.is_admin) {
  onAdminLogin?.(user);
}
      setLoginPassword("");

      setSuccessMessage(
        `Welcome to SafeTrip, ${
          user.first_name ||
          user.username ||
          username
        }!`
      );

      // --------------------------------------------------------
      // CLOSE MODAL
      // --------------------------------------------------------

      setTimeout(() => {
        closeAuthModal();
      }, 900);

    } catch (error) {
      console.error(
        "LOGIN FRONTEND ERROR:",
        error
      );

      setErrorMessage(
        "Unable to connect to the SafeTrip server. Please make sure Django is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
  localStorage.removeItem("safetrip_access_token");
  localStorage.removeItem("safetrip_refresh_token");
  localStorage.removeItem("safetrip_user");

  setLoggedInUser(null);
  onAdminLogout?.();
};

  // ============================================================
  // GOOGLE
  // ============================================================

  const handleGoogleLogin = () => {
    setErrorMessage(
      "Google sign-in is ready in the interface. Real Google OAuth will be connected after the Google Client ID is configured."
    );
  };

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  const handleForgotPassword = (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!forgotEmail.trim()) {
      setErrorMessage(
        "Please enter your email address."
      );

      return;
    }

    setSuccessMessage(
      "Password reset will be connected to the Django email reset service."
    );
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: ShieldCheck,
    },
    {
      id: "plan",
      label: "Plan Trip",
      icon: Navigation,
    },
    {
      id: "places",
      label: "Explore Places",
      icon: Star,
    },
    {
      id: "route",
      label: "Safe Routes",
      icon: Navigation,
    },
    {
      id: "reviews",
      label: "Community",
      icon: Heart,
    },
  ];

  return (
    <>
      {/* ======================================================
          MAIN NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">

        {/* TOP BANNER */}

        <div className="bg-slate-950 text-white text-xs sm:text-sm">

          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">

            <ShieldCheck className="w-4 h-4 text-teal-300" />

            <span>
              SafeTrip Karnataka — Travel Smart • Stay Safe • Explore Karnataka
            </span>

          </div>

        </div>

        {/* NAVBAR */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="h-20 flex items-center justify-between gap-4">

            {/* LOGO */}

            <button
              type="button"
              onClick={() =>
                setActiveTab("home")
              }
              className="flex items-center gap-3 shrink-0"
            >

              <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">

                <ShieldCheck className="w-6 h-6" />

              </div>

              <div className="text-left hidden sm:block">

                <div className="font-extrabold text-xl text-slate-900 leading-none">

                  SafeTrip{" "}

                  <span className="text-teal-600">
                    Karnataka
                  </span>

                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Travel Smart • Stay Safe
                </div>

              </div>

            </button>

            {/* DESKTOP NAVIGATION */}

            <nav className="hidden lg:flex items-center gap-1">

              {navItems.map((item) => {

                const Icon = item.icon;

                const active =
                  activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(item.id)
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >

                    <Icon className="w-4 h-4" />

                    {item.label}

                  </button>
                );

              })}

              {/* WOMEN SAFETY */}

              <button
                type="button"
                onClick={() => {
                  setWomenMode(true);
                  setActiveTab("women");
                }}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  womenMode
                    ? "bg-rose-50 text-rose-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >

                <Heart className="w-4 h-4" />

                Women Safety

              </button>

            </nav>

            {/* RIGHT ACTIONS */}

            <div className="flex items-center gap-2">

              {/* REPORT */}

              <button
                type="button"
                onClick={onOpenReport}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-sm font-bold"
              >

                <AlertTriangle className="w-4 h-4" />

                Report

              </button>

              {/* TRIP BRIEF */}

              <button
                type="button"
                onClick={onOpenBrief}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold"
              >

                <Sparkles className="w-4 h-4" />

                Trip Brief

              </button>

              {/* USER */}

              {loggedInUser ? (

                <div className="relative group">

                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  >

                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">

                      <User className="w-4 h-4" />

                    </div>

                    <span className="hidden sm:block text-sm font-bold text-slate-700 max-w-24 truncate">

                      {loggedInUser.first_name ||
                        loggedInUser.username}

                    </span>

                  </button>

                  <div className="absolute right-0 top-full pt-2 hidden group-hover:block">

                    <div className="w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-2">

                      <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100 mb-1">

                        @{loggedInUser.username}

                      </div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >

                        <LogOut className="w-4 h-4" />

                        Sign Out

                      </button>

                    </div>

                  </div>

                </div>

              ) : (

                <button
                  type="button"
                  onClick={() =>
                    openAuthModal("signin")
                  }
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold"
                >

                  <LogIn className="w-4 h-4" />

                  Sign In

                </button>

              )}

            </div>

          </div>

        </div>

      </header>

      {/* ======================================================
          AUTH MODAL
      ====================================================== */}

      {showAuthModal && (

        <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl bg-slate-950 text-white border border-white/10">

            {/* HEADER */}

            <div className="relative px-7 pt-7 pb-6 bg-gradient-to-b from-slate-900 to-slate-950">

              {/* CLOSE */}

              <button
                type="button"
                onClick={closeAuthModal}
                className="absolute top-4 right-4 w-9 h-9 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >

                <X className="w-5 h-5" />

              </button>

              {/* ICON */}

              <div className="flex justify-center mb-5">

                <div className="w-16 h-16 rounded-full bg-lime-300/20 ring-8 ring-lime-300/5 flex items-center justify-center">

                  <ShieldCheck className="w-8 h-8 text-lime-300" />

                </div>

              </div>

              {!showForgot && (

                <>
                  <h2 className="text-3xl font-extrabold text-center">

                    {authMode === "signin"
                      ? "Welcome Back!"
                      : "Create Your Account?"}

                  </h2>

                  <p className="text-center text-slate-400 text-sm mt-2">

                    {authMode === "signin"
                      ? "Sign in to access smart, personalized travel plans made for you."
                      : "Create your account to explore exciting destinations and safer journeys."}

                  </p>
                </>

              )}

              {showForgot && (

                <>
                  <h2 className="text-3xl font-extrabold text-center">

                    Forgot Password?

                  </h2>

                  <p className="text-center text-slate-400 text-sm mt-2">

                    Enter your email and we'll help you reset your password.

                  </p>
                </>

              )}

            </div>

            {/* BODY */}

            <div className="px-7 pb-7 bg-slate-950">

              {/* ERROR */}

              {errorMessage && (

                <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">

                  {errorMessage}

                </div>

              )}

              {/* SUCCESS */}

              {successMessage && (

                <div className="mb-4 px-4 py-3 rounded-xl border border-lime-300/30 bg-lime-300/10 text-lime-200 text-sm">

                  {successMessage}

                </div>

              )}

              {/* SIGN IN / SIGN UP TABS */}

              {!showForgot && (

                <div className="flex border-b border-white/10 mb-6">

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`flex-1 py-3 text-sm font-bold ${
                      authMode === "signin"
                        ? "text-lime-300 border-b-2 border-lime-300"
                        : "text-slate-500"
                    }`}
                  >

                    <LogIn className="inline w-4 h-4 mr-2" />

                    Sign In

                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`flex-1 py-3 text-sm font-bold ${
                      authMode === "signup"
                        ? "text-lime-300 border-b-2 border-lime-300"
                        : "text-slate-500"
                    }`}
                  >

                    <UserPlus className="inline w-4 h-4 mr-2" />

                    Sign Up

                  </button>

                </div>

              )}

              {/* FORGOT PASSWORD */}

              {showForgot ? (

                <form
                  onSubmit={handleForgotPassword}
                  className="space-y-4"
                >

                  <div>

                    <label className="block text-sm font-semibold mb-2">

                      Email address*

                    </label>

                    <div className="relative">

                      <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />

                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) =>
                          setForgotEmail(e.target.value)
                        }
                        placeholder="example@gmail.com"
                        className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 pl-11 pr-4 py-3 outline-none focus:border-lime-300"
                        required
                      />

                    </div>

                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-extrabold"
                  >

                    Send Reset Link

                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(false);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2"
                  >

                    <ArrowLeft className="w-4 h-4" />

                    Back to Sign In

                  </button>

                </form>

              ) : authMode === "signin" ? (

                /* SIGN IN */

                <form
                  onSubmit={handleSignin}
                  className="space-y-4"
                >

                  {/* USERNAME */}

                  <div>

                    <label className="block text-sm font-semibold mb-2">

                      Username*

                    </label>

                    <div className="relative">

                      <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />

                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) =>
                          setLoginUsername(e.target.value)
                        }
                        placeholder="Your username"
                        className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 pl-11 pr-4 py-3 outline-none focus:border-lime-300"
                        required
                      />

                    </div>

                  </div>

                  {/* PASSWORD */}

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <label className="block text-sm font-semibold">

                        Password*

                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setShowForgot(true);
                          setErrorMessage("");
                          setSuccessMessage("");
                        }}
                        className="text-xs text-lime-300 hover:text-lime-200 font-semibold"
                      >

                        Forgot Password?

                      </button>

                    </div>

                    <div className="relative">

                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />

                      <input
                        type={
                          showLoginPassword
                            ? "text"
                            : "password"
                        }
                        value={loginPassword}
                        onChange={(e) =>
                          setLoginPassword(e.target.value)
                        }
                        placeholder="Your password"
                        className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 pl-11 pr-11 py-3 outline-none focus:border-lime-300"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowLoginPassword(
                            (value) => !value
                          )
                        }
                        className="absolute right-3 top-2.5 w-8 h-8 text-slate-500 hover:text-white flex items-center justify-center"
                      >

                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}

                      </button>

                    </div>

                  </div>

                  {/* SIGN IN BUTTON */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-full bg-lime-300 hover:bg-lime-200 disabled:opacity-50 text-slate-950 font-extrabold flex items-center justify-center gap-2"
                  >

                    {loading ? (

                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>

                    ) : (

                      <>
                        <LogIn className="w-5 h-5" />
                        Sign In
                      </>

                    )}

                  </button>

                  <Divider />

                  <GoogleButton
                    onClick={handleGoogleLogin}
                  />

                  <p className="text-center text-sm text-slate-400 pt-2">

                    Don't have an account?

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="ml-1 text-lime-300 font-bold hover:underline"
                    >

                      Sign Up

                    </button>

                  </p>

                </form>

              ) : (

                /* SIGN UP */

                <form
                  onSubmit={handleSignup}
                  className="space-y-3"
                >

                  {/* NAME */}

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-sm font-semibold mb-2">

                        First Name*

                      </label>

                      <input
                        type="text"
                        value={signupFirstName}
                        onChange={(e) =>
                          setSignupFirstName(e.target.value)
                        }
                        placeholder="Madhu"
                        className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 px-4 py-3 outline-none focus:border-lime-300"
                        required
                      />

                    </div>

                    <div>

                      <label className="block text-sm font-semibold mb-2">

                        Last Name

                      </label>

                      <input
                        type="text"
                        value={signupLastName}
                        onChange={(e) =>
                          setSignupLastName(e.target.value)
                        }
                        placeholder="Last name"
                        className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 px-4 py-3 outline-none focus:border-lime-300"
                      />

                    </div>

                  </div>

                  {/* USERNAME */}

                  <div>

                    <label className="block text-sm font-semibold mb-2">

                      Username*

                    </label>

                    <input
                      type="text"
                      value={signupUsername}
                      onChange={(e) =>
                        setSignupUsername(e.target.value)
                      }
                      placeholder="Choose a username"
                      className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 px-4 py-3 outline-none focus:border-lime-300"
                      required
                    />

                  </div>

                  {/* EMAIL */}

                  <div>

                    <label className="block text-sm font-semibold mb-2">

                      Email address*

                    </label>

                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) =>
                        setSignupEmail(e.target.value)
                      }
                      placeholder="example@gmail.com"
                      className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 px-4 py-3 outline-none focus:border-lime-300"
                      required
                    />

                  </div>

                  {/* PASSWORD */}

                  <div>

                    <label className="block text-sm font-semibold mb-2">

                      Password*

                    </label>

                    <div className="relative">

                      <input
                        type={
                          showSignupPassword
                            ? "text"
                            : "password"
                        }
                        value={signupPassword}
                        onChange={(e) =>
                          setSignupPassword(e.target.value)
                        }
                        placeholder="Minimum 8 characters"
                        className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 px-4 pr-11 py-3 outline-none focus:border-lime-300"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowSignupPassword(
                            (value) => !value
                          )
                        }
                        className="absolute right-3 top-2.5 w-8 h-8 text-slate-500 hover:text-white flex items-center justify-center"
                      >

                        {showSignupPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}

                      </button>

                    </div>

                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div>

                    <label className="block text-sm font-semibold mb-2">

                      Confirm Password*

                    </label>

                    <input
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) =>
                        setSignupConfirmPassword(
                          e.target.value
                        )
                      }
                      placeholder="Repeat your password"
                      className="w-full rounded-xl bg-slate-900 border border-white/15 text-white placeholder:text-slate-600 px-4 py-3 outline-none focus:border-lime-300"
                      required
                    />

                  </div>

                  {/* CREATE ACCOUNT */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-full bg-lime-300 hover:bg-lime-200 disabled:opacity-50 text-slate-950 font-extrabold flex items-center justify-center gap-2"
                  >

                    {loading ? (

                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating account...
                      </>

                    ) : (

                      <>
                        <UserPlus className="w-5 h-5" />
                        Create Account
                      </>

                    )}

                  </button>

                  <Divider />

                  <GoogleButton
                    onClick={handleGoogleLogin}
                  />

                  <p className="text-center text-sm text-slate-400 pt-2">

                    Already have an account?

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signin");
                        setErrorMessage("");
                        setSuccessMessage("");
                      }}
                      className="ml-1 text-lime-300 font-bold hover:underline"
                    >

                      Sign In

                    </button>

                  </p>

                </form>

              )}

            </div>

          </div>

        </div>

      )}

    </>
  );
}

// ============================================================
// DIVIDER
// ============================================================

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">

      <div className="h-px flex-1 bg-white/10" />

      <span>
        Or continue with
      </span>

      <div className="h-px flex-1 bg-white/10" />

    </div>
  );
}

// ============================================================
// GOOGLE BUTTON
// ============================================================

function GoogleButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full border border-white/15 bg-slate-950 hover:bg-white/5 py-3 flex items-center justify-center gap-3 font-semibold text-white"
    >

      <span className="font-black text-lg text-white">
        G
      </span>

      Continue with Google

    </button>
  );
}