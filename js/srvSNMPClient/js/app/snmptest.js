const snmp = require ("net-snmp");

let session = snmp.createSession ("10.110.91.2", "public");

let oids = ["1.3.6.1.4.1.10297.101.1.3.1.1.16.3"];

session.get (oids, (e, varbinds) => {
    if (e) {
        console.error (e);
    } else {
        for (let i = 0; i < varbinds.length; i++) {
            if (snmp.isVarbindError (varbinds[i])) {
                console.error (snmp.varbindError (varbinds[i]));
            } else {
                console.log (varbinds[i].oid + " = " + varbinds[i].value);
            }
        }
    }
    session.close ();
});

session.trap (snmp.TrapType.LinkDown, (e) => {
    if (e) {
        console.error (e);
    }
});