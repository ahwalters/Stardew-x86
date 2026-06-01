const BASE_RSP = 0x7fff0040;

let architecture = 64;
let mineFloor = 1;

let regs = {
    rsp: BASE_RSP,
    rbp: BASE_RSP,
    rip: "Farm",
    rax: "0x0",
    rdi: "—",
    rsi: "—",
    rdx: "—",
    rbx: "0x0",
    r12: "0x0",
};

let stack = [{
    functionName: "Farm()",
    returnAddress: "0x00000000  (OS entry)",
    callerRSP: BASE_RSP,
    callerRBP: BASE_RSP,
    locals: ["gold = 500", "inventory[]", "cropCount = 3"],
    stackParams: [],
    regParams: [],
    frameBase: BASE_RSP,
    size: 32
}];

const locationBox = document.getElementById("locationBox");
const stackContainer = document.getElementById("stackContainer");
const registerContainer = document.getElementById("registerContainer");
const logBox = document.getElementById("logBox");
const registerTitle = document.getElementById("registerTitle");
const assemblyCode = document.getElementById("assemblyCode");

function toHex(n) {
    return "0x" + n.toString(16).toUpperCase().padStart(8, "0");
}

function addLog(message) {
    const line = document.createElement("div");
    line.classList.add("log-line");
    line.textContent = "> " + message;
    logBox.prepend(line);
}

function showAssembly(lines) {
    assemblyCode.textContent = lines.join("\n");
}

function pushFrame(frame) {
    frame.callerRSP = regs.rsp;
    frame.callerRBP = regs.rbp;
    const size = architecture === 64 ? 32 : 16;
    regs.rsp -= size;
    frame.frameBase = regs.rsp;
    frame.size = size;
    stack.push(frame);
}

function renderStack() {
    stackContainer.innerHTML = "";

    const rspDiv = document.createElement("div");
    rspDiv.className = "rsp-indicator";
    rspDiv.textContent = `${architecture === 64 ? "RSP" : "ESP"} = ${toHex(regs.rsp)}   ← top of stack`;
    stackContainer.appendChild(rspDiv);

    for (let i = stack.length - 1; i >= 0; i--) {
        const frame = stack[i];
        const div = document.createElement("div");
        div.classList.add("stack-frame");
        div.id = `frame-${i}`;

        let paramsHtml = "";
        if (frame.stackParams && frame.stackParams.length > 0) {
            paramsHtml = `<p class="stack-params"><strong>Stack Params (pushed right-to-left):</strong><br>${frame.stackParams.join(", ")}</p>`;
        }
        if (frame.regParams && frame.regParams.length > 0) {
            paramsHtml = `<p class="reg-params"><strong>Params via registers:</strong><br>${frame.regParams.join(", ")}</p>`;
        }

        div.innerHTML = `
            <div class="frame-header">
                <h3>${frame.functionName}</h3>
                <span class="frame-addr">${architecture === 64 ? "RBP" : "EBP"} = ${toHex(frame.frameBase)}</span>
            </div>
            <p><strong>Return Address:</strong> <span class="ret-addr">${frame.returnAddress}</span></p>
            ${paramsHtml}
            <p><strong>Locals:</strong> ${frame.locals.join(", ")}</p>
        `;

        stackContainer.appendChild(div);
    }
}

function renderRegisters() {
    registerContainer.innerHTML = "";
    registerTitle.textContent = `${architecture}-bit Registers`;

    const is64 = architecture === 64;

    const regDefs = is64 ? [
        ["RSP", toHex(regs.rsp),  "special", "Stack pointer"],
        ["RBP", toHex(regs.rbp),  "special", "Base pointer — callee-saved"],
        ["RIP", regs.rip,         "special", "Instruction pointer"],
        ["RAX", regs.rax,         "caller",  "Return value / caller-saved"],
        ["RDI", regs.rdi,         "param",   "Param 1 — caller-saved"],
        ["RSI", regs.rsi,         "param",   "Param 2 — caller-saved"],
        ["RDX", regs.rdx,         "param",   "Param 3 — caller-saved"],
        ["RBX", regs.rbx,         "callee",  "Callee-saved (must restore)"],
        ["R12", regs.r12,         "callee",  "Callee-saved (must restore)"],
    ] : [
        ["ESP", toHex(regs.rsp),  "special", "Stack pointer"],
        ["EBP", toHex(regs.rbp),  "special", "Base pointer — callee-saved"],
        ["EIP", regs.rip,         "special", "Instruction pointer"],
        ["EAX", regs.rax,         "caller",  "Return value / caller-saved"],
        ["ECX", "—",              "caller",  "Caller-saved"],
        ["EDX", "—",              "caller",  "Caller-saved"],
        ["EBX", regs.rbx,         "callee",  "Callee-saved (must restore)"],
        ["ESI", regs.r12,         "callee",  "Callee-saved (must restore)"],
        ["EDI", "—",              "callee",  "Callee-saved (must restore)"],
    ];

    regDefs.forEach(([name, value, type, desc]) => {
        const div = document.createElement("div");
        div.classList.add("register", `reg-${type}`);
        div.innerHTML = `<span class="reg-name">${name}</span><span class="reg-value">${value}</span><span class="reg-desc">${desc}</span>`;
        registerContainer.appendChild(div);
    });

    const legend = document.createElement("div");
    legend.className = "reg-legend";
    legend.innerHTML = `
        <span class="legend-item reg-special-l">Special</span>
        <span class="legend-item reg-param-l">Param regs</span>
        <span class="legend-item reg-caller-l">Caller-saved</span>
        <span class="legend-item reg-callee-l">Callee-saved</span>
    `;
    registerContainer.appendChild(legend);
}

function enterMines() {
    const floor = mineFloor++;
    const currentFunc = stack[stack.length - 1].functionName;

    addLog(`Calling MineFrame(floor=${floor})`);

    if (architecture === 64) {
        regs.rdi = `${floor}`;
        addLog(`RDI = ${floor}  (floor, param 1)`);
        showAssembly([
            "; 64-bit System V AMD64 ABI",
            `mov edi, ${floor}          ; floor → param register RDI`,
            "call MineFrame             ; CPU pushes RIP, jumps to MineFrame",
            "",
            "; === MineFrame prologue ===",
            "push rbp                   ; save caller's base pointer (callee-saved)",
            "mov rbp, rsp               ; RBP now points to this frame's base",
            "sub rsp, 24                ; allocate space for 3 local variables",
            "",
            "; Locals live at negative offsets from RBP:",
            "[rbp-8]  = currentFloor    ; mov [rbp-8], edi",
            "[rbp-16] = monsterHP",
            "[rbp-24] = oreCount",
        ]);
    } else {
        addLog(`push ${floor}  (floor pushed onto stack, right-to-left order)`);
        showAssembly([
            "; 32-bit cdecl convention",
            `push ${floor}              ; push floor arg onto stack`,
            "call MineFrame             ; CPU pushes EIP, jumps to MineFrame",
            "",
            "; === MineFrame prologue ===",
            "push ebp                   ; save caller's base pointer (callee-saved)",
            "mov ebp, esp               ; EBP now points to this frame's base",
            "sub esp, 12                ; allocate space for 3 local variables",
            "",
            "; Locals at negative offsets, params at positive:",
            "[ebp-4]  = currentFloor",
            "[ebp-8]  = monsterHP",
            "[ebp-12] = oreCount",
            "[ebp+8]  = floor arg       ; above saved EBP and return addr",
            "",
            "; Caller cleans up after return:",
            "add esp, 4                 ; remove pushed arg(s)",
        ]);
    }

    const retAddr = toHex(0xdeadbeef);
    pushFrame({
        functionName: "MineFrame()",
        returnAddress: retAddr + `  → ${currentFunc}`,
        locals: ["currentFloor = 1", "monsterHP = 50", "oreCount = 0"],
        stackParams: architecture === 32 ? [`floor = ${floor}`] : [],
        regParams:   architecture === 64 ? [`RDI = floor(${floor})`] : [],
    });

    regs.rbp = regs.rsp;
    regs.rip = "MineFrame";
    locationBox.textContent = "MineFrame()";
    addLog(`Frame pushed — ${architecture === 64 ? "RSP" : "ESP"} = ${toHex(regs.rsp)}`);

    document.querySelector("button[onclick='enterMines()']").textContent = `Enter MineFrame(${mineFloor})`;

    renderStack();
    renderRegisters();
}

function talkToAbigail() {
    const currentFunc = stack[stack.length - 1].functionName;

    addLog(`Calling talkToNPC(Abigail, Amethyst, 250)`);

    if (architecture === 64) {
        regs.rdi = "Abigail";
        regs.rsi = "Amethyst";
        regs.rdx = "250";
        addLog("RDI = Abigail, RSI = Amethyst, RDX = 250");
        showAssembly([
            "; 64-bit System V AMD64 ABI",
            "; First 6 integer args go in registers — no stack push needed",
            "mov rdi, Abigail           ; param 1",
            "mov rsi, Amethyst          ; param 2",
            "mov edx, 250               ; param 3 (friendship pts)",
            "call talkToNPC",
            "",
            "; === talkToNPC prologue ===",
            "push rbp",
            "mov rbp, rsp",
            "sub rsp, 24",
            "",
            "; Params already in registers — save to locals if needed:",
            "[rbp-8]  = npcName         ; mov [rbp-8], rdi",
            "[rbp-16] = giftItem        ; mov [rbp-16], rsi",
            "[rbp-24] = friendshipPoints ; mov [rbp-24], edx",
        ]);
    } else {
        addLog("Args pushed right-to-left: 250, Amethyst, Abigail");
        showAssembly([
            "; 32-bit cdecl: args pushed right-to-left",
            "push 250                   ; param 3 — last arg pushed first",
            "push Amethyst              ; param 2",
            "push Abigail               ; param 1 — first arg pushed last",
            "call talkToNPC",
            "",
            "; === talkToNPC prologue ===",
            "push ebp",
            "mov ebp, esp",
            "sub esp, 12",
            "",
            "; Access params above saved EBP and return address:",
            "[ebp+8]  = Abigail         ; param 1",
            "[ebp+12] = Amethyst        ; param 2",
            "[ebp+16] = 250             ; param 3",
            "",
            "; Caller cleans up after return:",
            "add esp, 12                ; remove 3 pushed args",
        ]);
    }

    const retAddr = toHex(0xcafebabe);
    pushFrame({
        functionName: "talkToNPC()",
        returnAddress: retAddr + `  → ${currentFunc}`,
        locals: ["npcName = Abigail", "giftItem = Amethyst", "friendshipPoints = 250"],
        stackParams: architecture === 32 ? ["Abigail", "Amethyst", "250"] : [],
        regParams:   architecture === 64 ? ["RDI=Abigail", "RSI=Amethyst", "RDX=250"] : [],
    });

    regs.rbp = regs.rsp;
    regs.rip = "talkToNPC";
    locationBox.textContent = "talkToNPC()";
    addLog(`Frame pushed — ${architecture === 64 ? "RSP" : "ESP"} = ${toHex(regs.rsp)}`);

    renderStack();
    renderRegisters();
}

function returnFunction() {
    if (stack.length === 1) {
        addLog("Already at Farm() — cannot return further");
        return;
    }

    const topIdx = stack.length - 1;
    const frame = stack[topIdx];
    const frameEl = document.getElementById(`frame-${topIdx}`);

    // Highlight the return address before popping
    if (frameEl) {
        frameEl.querySelector(".ret-addr").classList.add("highlight-ret");
        frameEl.classList.add("frame-returning");
    }

    addLog(`Reading return address: ${frame.returnAddress.split("→")[0].trim()}`);
    addLog(`CPU will jump to → ${frame.returnAddress.split("→")[1]?.trim() ?? "caller"}`);

    const ptr = architecture === 64 ? "r" : "e";
    showAssembly([
        "; Function epilogue — reverse of prologue",
        `mov ${ptr}sp, ${ptr}bp         ; collapse locals (restore stack pointer)`,
        `pop ${ptr}bp                   ; restore caller's base pointer (callee-saved)`,
        `ret                        ; pop return address into ${ptr.toUpperCase()}IP`,
        "",
        `; ${ptr.toUpperCase()}IP → resumes caller at ${frame.returnAddress.split("→")[0].trim()}`,
        `; ${ptr.toUpperCase()}BP restored — caller's frame is fully accessible again`,
    ]);

    setTimeout(() => {
        stack.pop();
        const prev = stack[stack.length - 1];

        regs.rsp = frame.callerRSP;
        regs.rbp = frame.callerRBP;
        regs.rip = prev.functionName.replace("()", "");
        regs.rax = "0x1";   // pretend the function returned 1
        // Param regs are caller-saved — caller knows they may be trashed
        regs.rdi = "—";
        regs.rsi = "—";
        regs.rdx = "—";

        locationBox.textContent = prev.functionName;
        addLog(`Returned — ${architecture === 64 ? "RSP" : "ESP"} = ${toHex(regs.rsp)}, ${architecture === 64 ? "RBP" : "EBP"} restored`);
        addLog(`RAX = 0x1  (return value)`);
        addLog("Caller's local variables are accessible again via RBP");

        renderStack();
        renderRegisters();
    }, 700);
}

function toggleArchitecture() {
    architecture = architecture === 64 ? 32 : 64;
    addLog(`Switched to ${architecture}-bit mode`);

    if (architecture === 32) {
        addLog("32-bit cdecl: all args pushed onto stack right-to-left");
        addLog("Caller cleans up the stack after the call");
        addLog("Callee-saved: EBX, ESI, EDI, EBP");
        addLog("Registers are 32-bit wide (EAX, EBX, not RAX, RBX)");
        showAssembly([
            "; 32-bit vs 64-bit key differences:",
            "",
            "; PARAMETER PASSING",
            "; 32-bit: push args onto stack (right-to-left)",
            "; 64-bit: first 6 args in RDI, RSI, RDX, RCX, R8, R9",
            "",
            "; STACK CLEANUP",
            "; 32-bit cdecl: caller does  add esp, N  after call",
            "; 64-bit: callee cleans its own frame with  mov rsp, rbp",
            "",
            "; REGISTER WIDTH",
            "; 32-bit: EAX (32-bit), max addressable = 4 GB",
            "; 64-bit: RAX (64-bit), max addressable = 16 exabytes",
            "",
            "; CALLEE-SAVED",
            "; 32-bit: EBX, ESI, EDI, EBP",
            "; 64-bit: RBX, RBP, R12-R15",
        ]);
    } else {
        addLog("64-bit System V AMD64 ABI: first 6 args in registers");
        addLog("Callee cleans its own frame");
        addLog("Callee-saved: RBX, RBP, R12–R15");
        addLog("Registers are 64-bit wide (RAX, RBX, not EAX, EBX)");
        showAssembly([
            "; 64-bit System V AMD64 ABI",
            "",
            "; PARAMETER PASSING",
            "; Arg 1 → RDI, Arg 2 → RSI, Arg 3 → RDX",
            "; Arg 4 → RCX, Arg 5 → R8,  Arg 6 → R9",
            "; Args 7+ → pushed onto stack",
            "",
            "; CALLER-SAVED (caller must preserve if it needs them):",
            "; RAX, RCX, RDX, RSI, RDI, R8, R9, R10, R11",
            "",
            "; CALLEE-SAVED (callee must restore before ret):",
            "; RBX, RBP, R12, R13, R14, R15",
            "",
            "; Stack must be 16-byte aligned before CALL instruction",
        ]);
    }

    renderRegisters();
}

function causeSegfault() {
    addLog("Buffer overflow: attacker wrote past local buffer boundary");
    addLog("Return address overwritten with 0x41414141 ('AAAA')");
    addLog("ret → pops 0x41414141 into RIP → CPU crashes");
    addLog("Segmentation Fault: Harvey found you unconscious");

    showAssembly([
        "; Normal stack frame layout (high → low address):",
        "; [return addr] [saved RBP] [local buffer ←─ grows here]",
        "",
        "; After stack buffer overflow:",
        "; [0x41414141 ] [AAAAAAAA ] [AAAAAAAAAAAAAAAA]",
        ";   ↑ return address overwritten by attacker data",
        "",
        "ret                        ; pops 0x41414141 into RIP",
        "; No mapping at 0x41414141 → SIGSEGV",
        "",
        "; This is why calling conventions matter for security:",
        "; predictable stack layout = predictable attack surface",
    ]);

    if (stack.length > 1) {
        stack[stack.length - 1].returnAddress = "0x41414141  ← CORRUPTED";
    }

    regs.rip = "0x41414141";
    locationBox.textContent = "Segmentation Fault";
    document.body.style.backgroundImage = "url('images/img1_ohxf3c.jpg')";
    document.querySelector(".subtitle").style.color = "black";

    renderStack();
    renderRegisters();

    setTimeout(() => {
        document.body.style.backgroundImage = "url('images/farm_day_1920x1080_wide-d49994dd6440a8dd9a0f2d5a9e826ffdfdb47959.png')";
        document.querySelector(".subtitle").style.color = "white";
        locationBox.textContent = stack[stack.length - 1].functionName;
    }, 2500);
}

function resetSimulation() {
    regs = {
        rsp: BASE_RSP,
        rbp: BASE_RSP,
        rip: "Farm",
        rax: "0x0",
        rdi: "—",
        rsi: "—",
        rdx: "—",
        rbx: "0x0",
        r12: "0x0",
    };

    stack = [{
        functionName: "Farm()",
        returnAddress: "0x00000000  (OS entry)",
        callerRSP: BASE_RSP,
        callerRBP: BASE_RSP,
        locals: ["gold = 500", "inventory[]", "cropCount = 3"],
        stackParams: [],
        regParams: [],
        frameBase: BASE_RSP,
        size: 32
    }];

    architecture = 64;
    mineFloor = 1;
    locationBox.textContent = "Farm()";
    document.querySelector("button[onclick='enterMines()']").textContent = `Enter MineFrame(${mineFloor})`;
    document.body.style.backgroundImage = "url('images/farm_day_1920x1080_wide-d49994dd6440a8dd9a0f2d5a9e826ffdfdb47959.png')";
    document.querySelector(".subtitle").style.color = "white";

    showAssembly([
        "; Program entry",
        "Farm:",
        "push rbp                   ; save OS's base pointer",
        "mov rbp, rsp               ; establish this frame's base",
        "sub rsp, 32                ; allocate locals (gold, inventory, cropCount)",
    ]);
    addLog("Simulation reset — 64-bit mode (System V AMD64 ABI)");

    renderStack();
    renderRegisters();
}

// Init
renderStack();
renderRegisters();
showAssembly([
    "; Program entry",
    "Farm:",
    "push rbp                   ; save OS's base pointer",
    "mov rbp, rsp               ; establish this frame's base",
    "sub rsp, 32                ; allocate locals (gold, inventory, cropCount)",
]);
addLog("Welcome to The Stardew Stack");
addLog("64-bit mode initialized (System V AMD64 ABI)");
