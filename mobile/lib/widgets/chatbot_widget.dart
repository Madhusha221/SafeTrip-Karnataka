
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../services/auth_service.dart';

class ChatbotWidget extends StatefulWidget {
  const ChatbotWidget({Key? key}) : super(key: key);

  @override
  State<ChatbotWidget> createState() => _ChatbotWidgetState();
}

class _ChatbotWidgetState extends State<ChatbotWidget> {
  bool isOpen = false;
  bool isLoading = false;

  final TextEditingController messageController =
      TextEditingController();

  final ScrollController scrollController =
      ScrollController();

  final List<Map<String, String>> messages = [
    {
      'role': 'assistant',
      'content':
          "Namaste! Welcome to SafeTrip Karnataka. I'm your travel assistant. How can I help you explore Karnataka?",
    },
  ];

  final List<String> suggestions = [
    'Best places to visit in Karnataka?',
    'Plan a 2-day trip to Coorg',
    'Famous places in Mysuru',
    'Best time to visit Hampi',
  ];

  static const Color teal = Color(0xFF0D9488);
  static const Color darkNavy = Color(0xFF0F172A);
  static const Color background = Color(0xFFF8FAFC);

  @override
  void dispose() {
    messageController.dispose();
    scrollController.dispose();
    super.dispose();
  }

  void scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scrollController.hasClients) {
        scrollController.animateTo(
          scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> handleSend([String? suggestedMessage]) async {
    final question =
        (suggestedMessage ?? messageController.text).trim();

    if (question.isEmpty || isLoading) return;

    setState(() {
      messages.add({
        'role': 'user',
        'content': question,
      });

      messageController.clear();
      isLoading = true;
    });

    scrollToBottom();

    try {
      final baseUrl = AuthService.baseUrl.replaceFirst(
        RegExp(r'/$'),
        '',
      );

      final uri = Uri.parse('$baseUrl/chatbot/');

      final response = await http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'message': question,
            }),
          )
          .timeout(const Duration(seconds: 45));

      final dynamic decoded = jsonDecode(response.body);

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        final error = decoded is Map
            ? decoded['error']?.toString()
            : null;

        throw Exception(
          error ?? 'Unable to generate an AI response.',
        );
      }

      if (decoded is! Map || decoded['reply'] == null) {
        throw Exception(
          'The chatbot returned an unexpected response.',
        );
      }

      final reply = decoded['reply'].toString();

      if (!mounted) return;

      setState(() {
        messages.add({
          'role': 'assistant',
          'content': reply,
        });
      });
    } catch (error) {
      if (!mounted) return;

      String errorText = error.toString();

      if (error is http.ClientException) {
        errorText = 'Unable to connect to the chatbot server.';
      }

      setState(() {
        messages.add({
          'role': 'assistant',
          'content':
              'Sorry, something went wrong.\n$errorText',
        });
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });

        scrollToBottom();
      }
    }
  }

  Widget buildHeader() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: const BoxDecoration(
        color: darkNavy,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(18),
        ),
      ),
      child: Row(
        children: [
          Container(
            height: 43,
            width: 43,
            decoration: BoxDecoration(
              color: teal,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.explore_outlined,
              color: Colors.white,
              size: 26,
            ),
          ),
          const SizedBox(width: 11),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SafeTrip AI Assistant',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Karnataka Travel Assistant',
                  style: TextStyle(
                    color: Color(0xFF5EEAD4),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              setState(() => isOpen = false);
            },
            icon: const Icon(
              Icons.close,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget buildWelcomeBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 11,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFFF0FDFA),
        border: Border(
          bottom: BorderSide(
            color: Color(0xFFCCFBF1),
          ),
        ),
      ),
      child: const Row(
        children: [
          Icon(
            Icons.auto_awesome,
            color: Color(0xFF0F766E),
            size: 16,
          ),
          SizedBox(width: 7),
          Text(
            'Your smart travel companion',
            style: TextStyle(
              color: Color(0xFF115E59),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget buildMessage(Map<String, String> item) {
    final isUser = item['role'] == 'user';

    return Align(
      alignment:
          isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 275),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 11,
        ),
        decoration: BoxDecoration(
          color: isUser ? teal : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(17),
            topRight: const Radius.circular(17),
            bottomLeft: Radius.circular(isUser ? 17 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 17),
          ),
          border: isUser
              ? null
              : Border.all(
                  color: const Color(0xFFE2E8F0),
                ),
          boxShadow: isUser
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 5,
                  ),
                ],
        ),
        child: Text(
          item['content'] ?? '',
          style: TextStyle(
            color: isUser
                ? Colors.white
                : const Color(0xFF334155),
            fontSize: 13,
            height: 1.5,
          ),
        ),
      ),
    );
  }

  Widget buildSuggestions() {
    if (messages.length != 1 || isLoading) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TRY ASKING',
            style: TextStyle(
              color: Color(0xFF64748B),
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 10),
          ...suggestions.map(
            (suggestion) => InkWell(
              onTap: () => handleSend(suggestion),
              borderRadius: BorderRadius.circular(11),
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(
                    color: const Color(0xFFE2E8F0),
                  ),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Text(
                  suggestion,
                  style: const TextStyle(
                    color: Color(0xFF334155),
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget buildLoadingIndicator() {
    if (!isLoading) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(
          horizontal: 13,
          vertical: 11,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
          ),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 16,
              width: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: teal,
              ),
            ),
            SizedBox(width: 9),
            Text(
              'Preparing your travel answer...',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget buildInput() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(
            color: Color(0xFFE2E8F0),
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: messageController,
              enabled: !isLoading,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => handleSend(),
              decoration: InputDecoration(
                hintText: 'Ask about Karnataka...',
                hintStyle: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF94A3B8),
                ),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            height: 44,
            width: 44,
            child: ElevatedButton(
              onPressed: isLoading ? null : () => handleSend(),
              style: ElevatedButton.styleFrom(
                backgroundColor: teal,
                foregroundColor: Colors.white,
                padding: EdgeInsets.zero,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: isLoading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(
                      Icons.send,
                      size: 19,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget buildChatPanel(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;

    final panelWidth = screenSize.width - 32 < 350
        ? screenSize.width - 32
        : 350.0;

    final panelHeight = screenSize.height * 0.65 > 520
        ? 520.0
        : screenSize.height * 0.65;

    return Container(
      width: panelWidth,
      height: panelHeight,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.18),
            blurRadius: 25,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          buildHeader(),
          buildWelcomeBanner(),
          Expanded(
            child: Container(
              color: background,
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(14),
                children: [
                  ...messages.map(buildMessage),
                  buildLoadingIndicator(),
                  buildSuggestions(),
                ],
              ),
            ),
          ),
          buildInput(),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Important: shrink-wrap the closed chatbot so it does not
    // occupy the entire Home screen or intercept its gestures.
    return Align(
      alignment: Alignment.bottomRight,
      widthFactor: 1,
      heightFactor: 1,
      child: Padding(
        padding: const EdgeInsets.only(
          right: 16,
          bottom: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (isOpen) ...[
              buildChatPanel(context),
              const SizedBox(height: 12),
            ],
            FloatingActionButton(
              heroTag: 'safetrip_ai_chatbot',
              backgroundColor: teal,
              foregroundColor: Colors.white,
              elevation: 7,
              onPressed: () {
                setState(() {
                  isOpen = !isOpen;
                });
              },
              child: Icon(
                isOpen
                    ? Icons.close
                    : Icons.explore_outlined,
                size: 28,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
