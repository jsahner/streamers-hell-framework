package com.example.jsahner.sh_vibrate

import android.content.Intent
import android.os.Bundle
import android.support.v7.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onStart() {
        super.onStart()
        val intent = Intent(this, IntentService::class.java)
        intent.action = "START_WS"
        startService(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
