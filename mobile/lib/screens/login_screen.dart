
import 'package:flutter/material.dart';
import 'home_screen.dart';
import 'package:safetrip_karnataka_mobile/services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool isLogin = true;
  bool isLoading = false;
  bool obscurePassword = true;
  bool obscureConfirmPassword = true;

  final usernameController = TextEditingController();
  final emailController = TextEditingController();
  final firstNameController = TextEditingController();
  final lastNameController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    usernameController.dispose();
    emailController.dispose();
    firstNameController.dispose();
    lastNameController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  void showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> handleAuthentication() async {
    final loginMode = isLogin;

    final username = usernameController.text.trim();
    final password = passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      showMessage('Please enter username and password.');
      return;
    }

    if (!loginMode) {
      if (emailController.text.trim().isEmpty ||
          firstNameController.text.trim().isEmpty ||
          lastNameController.text.trim().isEmpty ||
          confirmPasswordController.text.isEmpty) {
        showMessage('Please fill in all the fields.');
        return;
      }

      if (!emailController.text.trim().contains('@')) {
        showMessage('Please enter a valid email address.');
        return;
      }

      if (password.length < 8) {
        showMessage('Password must contain at least 8 characters.');
        return;
      }

      if (password != confirmPasswordController.text) {
        showMessage('Passwords do not match.');
        return;
      }
    }

    setState(() {
      isLoading = true;
    });

    Map<String, dynamic> result;

    try {
      if (loginMode) {
        result = await AuthService.login(
          username: username,
          password: password,
        );
      } else {
        result = await AuthService.register(
          username: username,
          email: emailController.text.trim(),
          firstName: firstNameController.text.trim(),
          lastName: lastNameController.text.trim(),
          password: password,
          confirmPassword: confirmPasswordController.text,
        );
      }
    } catch (e) {
      result = {
        'success': false,
        'message': 'Something went wrong. Please try again.',
      };
    }

    if (!mounted) return;

    setState(() {
      isLoading = false;
    });

    if (result['success'] == true) {
      if (loginMode) {
        showMessage('Login successful!');

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const HomeScreen(),
          ),
        );
      } else {
        // Registration successful: return to Login tab.
        setState(() {
          isLogin = true;
          passwordController.clear();
          confirmPasswordController.clear();
          obscurePassword = true;
          obscureConfirmPassword = true;
        });

        showMessage(
          'Account created successfully! Please log in.',
        );
      }
    } else {
      showMessage(
        result['message'] ?? 'Authentication failed.',
      );
    }
  }

  InputDecoration inputDecoration(
    String label,
    IconData icon,
  ) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(
        icon,
        color: const Color(0xFF00A88F),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(
          color: Color(0xFFE2E8F0),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(
          color: Color(0xFF00A88F),
          width: 1.5,
        ),
      ),
    );
  }

  Widget buildPasswordField({
    required String label,
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: inputDecoration(
        label,
        Icons.lock_outline,
      ).copyWith(
        suffixIcon: IconButton(
          icon: Icon(
            obscure ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: onToggle,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black87,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Column(
                  children: [
                    Image.asset(
                      'assets/images/safetrip_logo.png',
                      width: 170,
                      height: 170,
                      fit: BoxFit.contain,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isLogin
                          ? 'Welcome Back!'
                          : 'Create Your Account',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      isLogin
                          ? 'Continue your safe journey'
                          : 'Join SafeTrip Karnataka today',
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 30),

              // LOGIN / SIGNUP SWITCH
              Container(
                decoration: BoxDecoration(
                  color: Colors.blueGrey.shade100,
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          if (!isLoading) {
                            setState(() => isLogin = true);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: isLogin
                                ? Colors.white
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Center(
                            child: Text(
                              'Login',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          if (!isLoading) {
                            setState(() => isLogin = false);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: !isLogin
                                ? Colors.white
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Center(
                            child: Text(
                              'Sign Up',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // USERNAME
              TextField(
                controller: usernameController,
                decoration: inputDecoration(
                  'Username',
                  Icons.person_outline,
                ),
              ),

              const SizedBox(height: 16),

              // SIGNUP FIELDS
              if (!isLogin) ...[
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: inputDecoration(
                    'Email Address',
                    Icons.email_outlined,
                  ),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: firstNameController,
                  decoration: inputDecoration(
                    'First Name',
                    Icons.person_outline,
                  ),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: lastNameController,
                  decoration: inputDecoration(
                    'Last Name',
                    Icons.person_outline,
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // PASSWORD
              buildPasswordField(
                label: 'Password',
                controller: passwordController,
                obscure: obscurePassword,
                onToggle: () {
                  setState(() {
                    obscurePassword = !obscurePassword;
                  });
                },
              ),

              // CONFIRM PASSWORD
              if (!isLogin) ...[
                const SizedBox(height: 16),
                buildPasswordField(
                  label: 'Confirm Password',
                  controller: confirmPasswordController,
                  obscure: obscureConfirmPassword,
                  onToggle: () {
                    setState(() {
                      obscureConfirmPassword =
                          !obscureConfirmPassword;
                    });
                  },
                ),
              ],

              const SizedBox(height: 24),

              // SUBMIT BUTTON
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: isLoading
                      ? null
                      : handleAuthentication,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00A88F),
                    disabledBackgroundColor: Colors.grey,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          height: 23,
                          width: 23,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          isLogin ? 'Login' : 'Create Account',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 20),

              Center(
                child: GestureDetector(
                  onTap: () {
                    if (!isLoading) {
                      setState(() {
                        isLogin = !isLogin;
                      });
                    }
                  },
                  child: Text(
                    isLogin
                        ? "Don't have an account? Sign Up"
                        : 'Already have an account? Login',
                    style: const TextStyle(
                      color: Color(0xFF00A88F),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
