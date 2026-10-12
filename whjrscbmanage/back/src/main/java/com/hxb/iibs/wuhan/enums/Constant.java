package com.hxb.iibs.wuhan.enums;

public interface Constant {

    /**
     * 开关状态
     */
    class SwitchState {
        public final static String ON = "1";
        public final static String OFF = "0";
        public final static String YES = "Y";
        public final static String NO = "N";
    }

    /**
     * 常用任务状态
     */
    class JobState {
        /**
         * 等待执行
         */
        public final static String WAITING = "0";
        /**
         * 执行成功
         */
        public final static String SUCCESSED = "1";
        /**
         * 执行失败
         */
        public final static String FAILED = "2";
    }

    /** 业务状态（六态机） */
    class BizStatus {
        public static final int NOT_ENABLED = 0;  // 未完善，定时任务拉数后落库为此状态
        public static final int AUDITING    = 1;
        public static final int REJECTED    = 2;
        public static final int EFFECTIVE   = 3;
        public static final int EXPIRED    = 4;
        public static final int TERMINATED  = 5;
        public static final int PASS_RETIRE  = 6;
    }

    /** i助手审批状态 */
    class ApprovalStatus {
        public static final int PENDING = 0;
        public static final int PASS    = 1;
        public static final int REJECT  = 2;
    }

    /** 还款计划状态 */
    class RepaymentStatus {
        public static final int INVALID   = 0;  // 已失效，被新计划替换
        public static final int AUDITING = 1;  // 审批中（草稿）
        public static final int EFFECTIVE = 2; // 已生效
    }

    /** 开关常量 */
    class Switch {
        public static final String YES = "是";
        public static final String NO  = "否";
    }

    /**
     * i 助手审批状态
     */
    class IHelperState {
        /**
         * 待审批
         */
        public final static String WAITING = "待审批";
        /**
         * 通过
         */
        public final static String PASS = "通过";
        /**
         * 否决
         */
        public final static String REJECT = "否决";
        /**
         * 中止
         */
        public final static String TERMINATE = "中止";
        /**
         * 撤回
         */
        public final static String CANCEL = "撤回";
        /**
         * 新增
         */
        public final static String ADD = "新增";
        /**
         * 已填报
         */
        public final static String INPUT = "已填报";
    }

    // ===== 以下为 Schema 大改（2026-06-03）新增枚举组 =====

    /** 是/否类布尔字段统一编码 */
    class Bool {
        public static final String YES = "1";
        public static final String NO  = "0";

        /** 将整数码解码为中文标签，decode 的逆函数 */
        public static String decode(String code) {
            return YES.equals(code) ? "是" : "否";
        }
    }

    /** 绿色/科技标识，0=绿色，1=科技，2=养老，3=不涉及 */
    class GreenTechFlag {
        public static final String GREEN   = "0";
        public static final String TECH    = "1";
        public static final String ELDERLY = "2";  // 养老，2026-06-03 新增
        public static final String NONE    = "3";

        public static String decode(String code) {
            return switch (code) {
                case GREEN   -> "绿色";
                case TECH    -> "科技";
                case ELDERLY -> "养老";
                case NONE    -> "不涉及";
                default      -> code;
            };
        }

        /** 将中文字符串反向编码为整数，decode 的逆函数 */
        public static String encode(String label) {
            return switch (label) {
                case "绿色"   -> GREEN;
                case "科技"  -> TECH;
                case "养老"  -> ELDERLY;
                case "不涉及" -> NONE;
                default       -> label;
            };
        }
    }

    /**
     * 行业分类（共18类）
     *
     * @see work/plans/2026-06-29-upper-storage-rate-auto-calc.md
     */
    class IndustryEnum {
        public static final String FINANCE          = "0";   // 金融业
        public static final String REAL_ESTATE     = "1";   // 房地产业
        public static final String LEASE_COMMERCE  = "2";   // 租赁和商务服务业
        public static final String SCIENCE_TECH     = "3";   // 科学研究和技术服务业
        public static final String WATER_ENVIRON   = "4";   // 水利、环境和公共设施管理业
        public static final String RESIDENT_SERVICE= "5";   // 居民服务、修理和其他服务业
        public static final String EDUCATION_HEALTH= "6";  // 教育、卫生和社会工作
        public static final String CULTURE_SPORTS   = "7";   // 文化、体育和娱乐业
        public static final String PUBLIC_MANAGE   = "8";   // 公共管理、社会保障和社会组织
        public static final String AGRICULTURE      = "9";   // 农、林、牧、渔业
        public static final String MINING           = "10";  // 采矿业
        public static final String MANUFACTURING    = "11";  // 制造业
        public static final String ENERGY_WATER     = "12";  // 电力、热力、燃气及水生产和供应业
        public static final String CONSTRUCTION     = "13";  // 建筑业
        public static final String WHOLESALE_RETAIL = "14";   // 批发和零售业
        public static final String TRANSPORT_LOGIS  = "15";  // 交通运输、仓储和邮政业
        public static final String HOTEL_CATERING   = "16";  // 住宿和餐饮业
        public static final String IT_SOFTWARE      = "17";  // 信息传输、软件和信息技术服务业

        public static String decode(String code) {
            if (code == null) return "";
            return switch (code) {
                case FINANCE          -> "金融业";
                case REAL_ESTATE     -> "房地产业";
                case LEASE_COMMERCE  -> "租赁和商务服务业";
                case SCIENCE_TECH     -> "科学研究和技术服务业";
                case WATER_ENVIRON   -> "水利、环境和公共设施管理业";
                case RESIDENT_SERVICE-> "居民服务、修理和其他服务业";
                case EDUCATION_HEALTH-> "教育、卫生和社会工作";
                case CULTURE_SPORTS   -> "文化、体育和娱乐业";
                case PUBLIC_MANAGE   -> "公共管理、社会保障和社会组织";
                case AGRICULTURE      -> "农、林、牧、渔业";
                case MINING           -> "采矿业";
                case MANUFACTURING    -> "制造业";
                case ENERGY_WATER     -> "电力、热力、燃气及水生产和供应业";
                case CONSTRUCTION     -> "建筑业";
                case WHOLESALE_RETAIL -> "批发和零售业";
                case TRANSPORT_LOGIS  -> "交通运输、仓储和邮政业";
                case HOTEL_CATERING   -> "住宿和餐饮业";
                case IT_SOFTWARE      -> "信息传输、软件和信息技术服务业";
                default               -> code;
            };
        }

        public static String encode(String label) {
            if (label == null || label.isBlank()) return null;
            return switch (label.trim()) {
                case "金融业" -> FINANCE;
                case "房地产业" -> REAL_ESTATE;
                case "租赁和商务服务业" -> LEASE_COMMERCE;
                case "科学研究和技术服务业" -> SCIENCE_TECH;
                case "水利、环境和公共设施管理业" -> WATER_ENVIRON;
                case "居民服务、修理和其他服务业" -> RESIDENT_SERVICE;
                case "教育、卫生和社会工作" -> EDUCATION_HEALTH;
                case "文化、体育和娱乐业" -> CULTURE_SPORTS;
                case "公共管理、社会保障和社会组织" -> PUBLIC_MANAGE;
                case "农、林、牧、渔业" -> AGRICULTURE;
                case "采矿业" -> MINING;
                case "制造业" -> MANUFACTURING;
                case "电力、热力、燃气及水生产和供应业" -> ENERGY_WATER;
                case "建筑业" -> CONSTRUCTION;
                case "批发和零售业" -> WHOLESALE_RETAIL;
                case "交通运输、仓储和邮政业" -> TRANSPORT_LOGIS;
                case "住宿和餐饮业" -> HOTEL_CATERING;
                case "信息传输、软件和信息技术服务业" -> IT_SOFTWARE;
                default -> label;
            };
        }
    }

    /**
     * 对应处室（部门）
     *
     * @see work/plans/2026-06-29-upper-storage-rate-auto-calc.md
     */
    class DeptEnum {
        public static final String TONGYE          = "0";   // 同业室
        public static final String LVLI            = "1";   // 利率室
        public static final String HUILV           = "2";   // 汇率室
        public static final String TONGYE_YINGXIAO = "3";   // 同业营销管理室
        public static final String ZIFEIYINGKUI   = "4";   // 自负盈亏账户

        public static String decode(String code) {
            if (code == null) return "";
            return switch (code) {
                case TONGYE          -> "同业室";
                case LVLI            -> "利率室";
                case HUILV           -> "汇率室";
                case TONGYE_YINGXIAO -> "同业营销管理室";
                case ZIFEIYINGKUI   -> "自负盈亏账户";
                default              -> code;
            };
        }

        /** 将中文标签反向编码为数字代码，是 decode 的逆函数 */
        public static String encode(String label) {
            if (label == null || label.isBlank()) {
                return null;
            }
            return switch (label.trim()) {
                case "同业室"         -> TONGYE;
                case "利率室"         -> LVLI;
                case "汇率室"         -> HUILV;
                case "同业营销管理室" -> TONGYE_YINGXIAO;
                case "自负盈亏账户"   -> ZIFEIYINGKUI;
                default               -> null;
            };
        }
    }

    /** 客户分类，0=一类，1=二类，2=三类，3=四类 */
    class CustomerTypeEnum {
        public static final String TYPE_ONE   = "0";
        public static final String TYPE_TWO   = "1";
        public static final String TYPE_THREE = "2";
        public static final String TYPE_FOUR  = "3";

        public static String decode(String code) {
            return switch (code) {
                case TYPE_ONE   -> "一类";
                case TYPE_TWO   -> "二类";
                case TYPE_THREE -> "三类";
                case TYPE_FOUR  -> "四类";
                default         -> code;
            };
        }

        /** 将中文标签反向编码为数字代码，是 decode 的逆函数 */
        public static String encode(String label) {
            if (label == null || label.isBlank()) {
                return null;
            }
            return switch (label.trim()) {
                case "一类" -> TYPE_ONE;
                case "二类" -> TYPE_TWO;
                case "三类" -> TYPE_THREE;
                case "四类" -> TYPE_FOUR;
                default    -> null;  // 未知值降级返回 null，由调用方打日志
            };
        }
    }

    /** 债券类型，0=标债，1=非标 */
    class BondTypeEnum {
        public static final String STANDARD_BOND = "0";
        public static final String NON_STANDARD  = "1";

        public static String decode(String code) {
            return switch (code) {
                case STANDARD_BOND -> "标准化业务";
                case NON_STANDARD  -> "非标准化业务";
                default            -> code;
            };
        }

        public static String encode(String label) {
            return switch (label) {
                case "标准化业务", "标债" -> STANDARD_BOND;
                case "非标准化业务", "非标" -> NON_STANDARD;
                default -> label;
            };
        }
    }

    /** 担保情况，0=信用，1=抵押，2=质押，3=保证，其他 */
    class GuaranteeInfoEnum {
        public static final String CREDIT   = "0";
        public static final String MORTGAGE = "1";
        public static final String PLEDGE   = "2";
        public static final String GUARANTEE = "3";

        public static String decode(String code) {
            return switch (code) {
                case CREDIT   -> "信用";
                case MORTGAGE -> "抵押";
                case PLEDGE   -> "质押";
                case GUARANTEE -> "保证";
                default       -> code;
            };
        }

        public static String encode(String label) {
            return switch (label) {
                case "信用" -> CREDIT;
                case "抵押" -> MORTGAGE;
                case "质押" -> PLEDGE;
                case "保证" -> GUARANTEE;
                default -> label;
            };
        }
    }

    /** 业务品种，0~12 共13种 */
    class BizTypeEnum {
        public static final String BIZ_00 = "0";   // 非金融企业类债券投资
        public static final String BIZ_01 = "1";   // 企业资产支持证券
        public static final String BIZ_02 = "2";   // 非交易类-产业基金
        public static final String BIZ_03 = "3";   // 非交易类-城镇化建设基金
        public static final String BIZ_04 = "4";   // 非交易类-同业资产收益权
        public static final String BIZ_05 = "5";   // 交易类-保险债权投资计划
        public static final String BIZ_06 = "6";   // 交易类-券商收益权凭证
        public static final String BIZ_07 = "7";   // 交易类-特定目的载体投资信用债
        public static final String BIZ_08 = "8";   // 交易类-债权融资计划
        public static final String BIZ_09 = "9";   // 金租通
        public static final String BIZ_10 = "10";  // 银证投融通
        public static final String BIZ_11 = "11";  // 债务融资工具(余额包销或持有)
        public static final String BIZ_12 = "12";  // 其他

        public static String decode(String code) {
            return switch (code) {
                case BIZ_00 -> "非金融企业类债券投资";
                case BIZ_01 -> "企业资产支持证券";
                case BIZ_02 -> "非交易类-产业基金";
                case BIZ_03 -> "非交易类-城镇化建设基金";
                case BIZ_04 -> "非交易类-同业资产收益权";
                case BIZ_05 -> "交易类-保险债权投资计划";
                case BIZ_06 -> "交易类-券商收益权凭证";
                case BIZ_07 -> "交易类-特定目的载体投资信用债";
                case BIZ_08 -> "交易类-债权融资计划";
                case BIZ_09 -> "金租通";
                case BIZ_10 -> "银证投融通";
                case BIZ_11 -> "债务融资工具(余额包销或持有)";
                case BIZ_12 -> "其他";
                default     -> code;
            };
        }

        /** 将中文字符串反向编码为整数，decode 的逆函数 */
        public static String encode(String label) {
            return switch (label) {
                case "非金融企业类债券投资" -> BIZ_00;
                case "企业资产支持证券" -> BIZ_01;
                case "非交易类-产业基金" -> BIZ_02;
                case "非交易类-城镇化建设基金" -> BIZ_03;
                case "非交易类-同业资产收益权" -> BIZ_04;
                case "交易类-保险债权投资计划" -> BIZ_05;
                case "交易类-券商收益权凭证" -> BIZ_06;
                case "交易类-特定目的载体投资信用债" -> BIZ_07;
                case "交易类-债权融资计划" -> BIZ_08;
                case "金租通" -> BIZ_09;
                case "银证投融通" -> BIZ_10;
                case "债务融资工具(余额包销或持有)" -> BIZ_11;
                case "其他" -> BIZ_12;
                default -> label;
            };
        }
    }
}
