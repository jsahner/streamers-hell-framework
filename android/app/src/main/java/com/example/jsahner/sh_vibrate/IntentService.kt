package com.example.jsahner.sh_vibrate

import android.app.IntentService
import android.content.Context
import android.content.Intent
import android.os.Vibrator
import android.text.format.DateUtils
import com.google.gson.Gson
import org.java_websocket.WebSocket
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.lang.Exception
import java.net.URI
import java.util.*
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread


// TODO: Rename actions, choose action names that describe tasks that this
// IntentService can perform, e.g. ACTION_FETCH_NEW_ITEMS
private const val ACTION_WS = "START_WS"

/**
 * An [IntentService] subclass for handling asynchronous task requests in
 * a service on a separate handler thread.
 * TODO: Customize class - update intent actions, extra parameters and static
 * helper methods.
 */
class IntentService : IntentService("IntentService") {
    companion object {
        private const val id = "Vibrate"
        private val vibrating = AtomicBoolean(false)
    }

    private var ws: WebSocketClient? = null

    override fun onHandleIntent(intent: Intent?) {
        if (intent?.action != ACTION_WS) {
            return
        }

        ws = object : WebSocketClient(URI("ws://192.168.1.101:61000")) {
            private val gson = Gson()
            private val openingMessage: String
            private val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator

            init {
                val data = listOf(ClientRegisterModification("Vibration Feedback", "Vibrate"))
                openingMessage = gson.toJson(ClientRegister(data))
            }

            fun onStartRequest(duration: Int) {
                if (!vibrating.compareAndSet(false, true)) {
                    return
                }

                thread(start = true) {
                    sendExecutionStartedMessage()

                    vibrator.vibrate(longArrayOf(0,
                            2 * DateUtils.SECOND_IN_MILLIS, 8 * DateUtils.SECOND_IN_MILLIS,
                            2 * DateUtils.SECOND_IN_MILLIS, 8 * DateUtils.SECOND_IN_MILLIS,
                            2 * DateUtils.SECOND_IN_MILLIS, 8 * DateUtils.SECOND_IN_MILLIS,
                            2 * DateUtils.SECOND_IN_MILLIS, 8 * DateUtils.SECOND_IN_MILLIS,
                            2 * DateUtils.SECOND_IN_MILLIS, 8 * DateUtils.SECOND_IN_MILLIS,
                            2 * DateUtils.SECOND_IN_MILLIS, 8 * DateUtils.SECOND_IN_MILLIS)
                            , 10)


                    Thread.sleep((duration * 1000).toLong())

                    if (vibrating.compareAndSet(true, false)) {
                        vibrator.cancel()
                        sendExecutionStoppedMessage()
                    }
                }
            }

            override fun onOpen(handshakedata: ServerHandshake?) {
                send(openingMessage)
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                onError(null)
            }

            override fun onMessage(message: String?) {
                try {
                    val props = gson.fromJson(message, Properties::class.java)

                    when (props.getProperty("type")) {
                        "Client.Initialize" -> {
                            val msg = ClientInitialized(listOf("Vibrate"))
                            ws?.send(gson.toJson(msg))
                        }
                        "Execution.StartRequest" -> onStartRequest(props.getProperty("length").toInt())
                        "Execution.StopRequest" -> {
                            if (vibrating.compareAndSet(true, false)) {
                                vibrator.cancel()
                                sendExecutionStoppedMessage()
                            }
                        }
                    }
                } catch (e: Exception) {
                }
            }

            override fun onError(ex: Exception?) {
                thread(start = true) {
                    Thread.sleep(1000)
                    tryReconnect()
                }
            }
        }

        ws?.connect()
    }

    private fun sendExecutionStartedMessage() {
        try {
            val gson = Gson()
            val msg = ExecutionStarted("Vibrate")
            ws?.send(gson.toJson(msg))
        } catch (e: Exception) {
        }
    }

    private fun sendExecutionStoppedMessage() {
        try {
            val gson = Gson()
            val msg = ExecutionStopped(listOf("Vibrate"))
            ws?.send(gson.toJson(msg))
        } catch (e: Exception) {
        }
    }

    fun tryReconnect() {
        if (ws?.readyState == WebSocket.READYSTATE.CLOSED) {
            ws?.reconnectBlocking()
        }
    }
}
